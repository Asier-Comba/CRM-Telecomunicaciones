import test from 'node:test'
import assert from 'node:assert/strict'
import {loadCollectionLabels} from '../../src/features/product/integration/collection-labels.ts'
import {IntegratedLocalProductRepository} from '../../src/features/product/integration/repository.ts'
const id='10000000-0000-4000-8000-000000000001'
const customer={id,version:1,display_name:'Current synthetic customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const operator={id,version:1,code:'synthetic',display_name:'Delayed synthetic operator',status:'active',source:'manual'}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
const envelope=(operation,value)=>({ok:true,data:{contract_version:'telecom.collections.v1',operation,...value}})

test('current customer is published while a distinct operator read is pending, with page deduplication and stable snapshots',{timeout:5000},async()=>{
 const slow=deferred(),fast=deferred(),calls=[],snapshots=[]
 const repository=new IntegratedLocalProductRepository(async(path,init)=>{
  assert.equal(path,'/api/product/v1/queries');assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store')
  const q=JSON.parse(init.body);calls.push(q)
  if(q.operation==='customer.list')return Response.json(envelope(q.operation,{items:[customer],next_id:null}))
  assert.equal(q.operation,'operator.get');await slow.promise;return Response.json(envelope(q.operation,{record:operator}))
 })
 const loading=loadCollectionLabels(repository,Array.from({length:20},()=>({customer_id:id,operator_id:id})),()=>true,labels=>{snapshots.push(labels);if(labels.customer[id])fast.resolve()})
 await fast.promise
 assert.equal(calls.length,2);assert.equal(snapshots.length,1);assert.equal(snapshots[0].customer[id],customer.display_name);assert.equal(snapshots[0].operator[id],null)
 assert.deepEqual(calls[0],{operation:'customer.list',input:{limit:1,sort:'id_asc',after_id:'10000000-0000-4000-8000-000000000000'}})
 slow.resolve();const result=await loading
 assert.equal(result.operator[id],operator.display_name);assert.equal(snapshots.length,2);assert.equal(snapshots[0].operator[id],null)
 snapshots[0].customer[id]='Synthetic consumer mutation'
 assert.equal(result.customer[id],customer.display_name);assert.equal(snapshots[1].customer[id],customer.display_name)
})

test('disposing after the first label blocks late publications and queued reads while preserving the four-read bound',{timeout:5000},async()=>{
 const slow=deferred(),allStarted=deferred();let active=true,calls=0,inFlight=0,max=0,publications=0
 const rows=Array.from({length:12},(_,i)=>({customer_id:id,operator_id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}))
 const repository={collection:async operation=>{
  calls++;inFlight++;max=Math.max(max,inFlight);if(calls===4)allStarted.resolve();await allStarted.promise
  try{if(operation==='customer.list')return{items:[customer]};await slow.promise;throw Error('private synthetic transport failure')}finally{inFlight--}
 }}
 const loading=loadCollectionLabels(repository,rows,()=>active,()=>{publications++;active=false;slow.resolve()})
 const result=await loading
 assert.equal(calls,4);assert.equal(max,4);assert.equal(publications,1);assert.equal(result.customer[id],customer.display_name);assert.ok(Object.values(result.operator).every(v=>v===null))
})

test('a fresh revoked page publishes closed unavailability labels without reusing the previous successful identities',{timeout:5000},async()=>{
 const rows=[{customer_id:id,operator_id:id}];let reads=0
 const run=async denied=>loadCollectionLabels(new IntegratedLocalProductRepository(async(_path,init)=>{
  reads++;const q=JSON.parse(init.body)
  return denied?Response.json({ok:false,error:'access_denied'},{status:403}):Response.json(envelope(q.operation,q.operation==='customer.list'?{items:[customer],next_id:null}:{record:operator}))
 }),rows,()=>true)
 const granted=await run(false),revoked=await run(true)
 assert.equal(reads,4);assert.equal(granted.customer[id],customer.display_name);assert.equal(revoked.customer[id],'Cliente no disponible');assert.equal(revoked.operator[id],'Operador no disponible')
 assert.equal(JSON.stringify(revoked).includes(customer.display_name),false)
})
