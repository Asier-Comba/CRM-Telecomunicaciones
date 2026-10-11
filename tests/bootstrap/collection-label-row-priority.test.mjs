import test from 'node:test'
import assert from 'node:assert/strict'
import {loadCollectionLabels} from '../../src/features/product/integration/collection-labels.ts'
import {IntegratedLocalProductRepository} from '../../src/features/product/integration/repository.ts'

const id='10000000-0000-4000-8000-000000000001'
const customer={id,version:1,display_name:'First current customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const operator={id,version:1,code:'synthetic',display_name:'First current operator',status:'active',source:'manual'}
const plan={id,plan_id:id,operator_id:id,service_kind:'mobile',version_number:1,valid_from:'2020-01-01',valid_until:'2021-01-01',currency:'EUR',recurring_amount_minor:'9007199254740993',plan_status:'retired'}

test('first-row references complete before later customers, without collapsing equal IDs across reference kinds',{timeout:5000},async()=>{
 let release;const held=new Promise(resolve=>{release=resolve}),calls=[],snapshots=[];let inFlight=0,max=0
 const rows=Array.from({length:20},(_,index)=>({customer_id:'10000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),operator_id:id,plan_version_id:id}))
 const repository=new IntegratedLocalProductRepository(async(path,init)=>{
  assert.equal(path,'/api/product/v1/queries');assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store')
  const q=JSON.parse(init.body);calls.push(q);inFlight++;max=Math.max(max,inFlight)
  try{
   let value
   if(q.operation==='customer.list'){
    const n=BigInt('0x'+q.input.after_id.replaceAll('-',''))+1n,hex=n.toString(16).padStart(32,'0'),currentId=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20)
    if(currentId!==id)await held
    value={items:[{...customer,id:currentId}],next_id:null}
   }else if(q.operation==='operator.get')value={record:operator}
   else{assert.equal(q.operation,'plan_version.get');value={record:plan}}
   return Response.json({ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,...value}})
  }finally{inFlight--}
 })
 const loading=loadCollectionLabels(repository,rows,()=>true,labels=>snapshots.push(labels))
 try{
  // Flush local promise work; held reads cannot complete until explicitly released.
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(snapshots.at(-1)?.customer[id],customer.display_name)
  assert.equal(snapshots.at(-1)?.operator[id],operator.display_name)
  assert.match(snapshots.at(-1)?.plan_version[id]??'',/^Versión 1 · /)
  assert.ok(max<=4);assert.ok(calls.length<22)
 }finally{release();await loading}
 assert.equal(calls.length,22)
 assert.equal(calls.filter(q=>q.operation==='operator.get').length,1)
 assert.equal(calls.filter(q=>q.operation==='plan_version.get').length,1)
 assert.equal(calls.filter(q=>q.operation==='customer.list').length,20)
 assert.equal(snapshots.length,22)
 assert.ok(Object.values(snapshots[0].customer).some(label=>label===null))
})
