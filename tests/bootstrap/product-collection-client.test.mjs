import test from 'node:test'
import assert from 'node:assert/strict'
import {IntegratedLocalProductRepository,SyntheticProductRepository,ProductUiError,customerSaveIntent} from '../../src/features/product/integration/repository.ts'
const id='10000000-0000-4000-8000-000000000001'
const customer={id,version:1,display_name:'Synthetic company',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const page=(operation,items,next_id=null)=>({contract_version:'telecom.collections.v1',operation,items,next_id})
test('ordinary collection uses cookie transport, exact filters and validated real cursor',async()=>{
 const calls=[],repository=new IntegratedLocalProductRepository(async(path,init)=>{
  assert.equal(path,'/api/product/v1/queries');assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store')
  const body=JSON.parse(init.body);calls.push(body)
  return Response.json({ok:true,data:page('customer.list',body.input.after_id?[]:[customer],body.input.after_id?null:id)})
 })
 const first=await repository.collection('customer.list',{limit:1,status:'active'})
 const second=await repository.collection('customer.list',{limit:1,status:'active',after_id:first.next_id})
 assert.equal(first.items[0].display_name,'Synthetic company');assert.deepEqual(second.items,[])
 assert.deepEqual(calls[1],{operation:'customer.list',input:{limit:1,status:'active',after_id:id}})
})
test('collection boundary rejects private fields and invalid cursor order without partial rows',async()=>{
 for(const data of [page('customer.list',[{...customer,email:'private@example.invalid'}]),page('customer.list',[customer,customer]),page('customer.list',[customer],'10000000-0000-4000-8000-000000000002')]){
  const repository=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data}))
  await assert.rejects(repository.collection('customer.list',{limit:2}),e=>e.code==='internal_safe')
 }
 let called=false;const repository=new IntegratedLocalProductRepository(async()=>{called=true;return Response.json({})})
 await assert.rejects(repository.collection('customer.list',{after_id:null}),e=>e.code==='validation');assert.equal(called,false)
})
test('historical plan version keeps exact bigint money and requested identity',async()=>{
 const record={id,plan_id:id,operator_id:id,service_kind:'mobile',version_number:1,valid_from:'2020-01-01',valid_until:'2021-01-01',currency:'EUR',recurring_amount_minor:'9007199254740993',plan_status:'retired'}
 const repository=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data:{contract_version:'telecom.collections.v1',operation:'plan_version.get',record}}))
 const result=await repository.collection('plan_version.get',{id});assert.equal(result.record.recurring_amount_minor,'9007199254740993');assert.equal(result.record.valid_until,'2021-01-01')
 await assert.rejects(repository.collection('plan_version.get',{id:'10000000-0000-4000-8000-000000000002'}),e=>e.code==='internal_safe')
})
test('revocation stays an access error and synthetic transport invents no inventory',async()=>{
 const repository=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'access_denied'},{status:403}))
 await assert.rejects(repository.collection('assignee.list',{}),e=>e.code==='access_denied')
 await assert.rejects(new SyntheticProductRepository().collection('customer.list',{}),e=>e.code==='unavailable')
})
test('confirmed customer creation survives failed fresh read without issuing another write',async()=>{
 let writes=0,reads=0
 const receipt={contract_version:'product.v1',operation:'customer.create',id,version:2,status:'active',command_id:id}
 const repository={command:async()=>{writes++;return receipt},customer:async()=>{if(++reads===1)throw new ProductUiError('transport_uncertain');return {id,version:2}}}
 const action=customerSaveIntent('customer.create',{account_kind:'legal_entity',legal_name:'Synthetic'})
 await assert.rejects(action.execute(repository),e=>e.code==='transport_uncertain');assert.equal(action.confirmed,true)
 assert.equal(await action.execute(repository),receipt);assert.equal(writes,1);assert.equal(reads,2)
})
test('stale fresh customer read cannot confirm a completed write',async()=>{
 let writes=0
 const repository={command:async()=>{writes++;return {id,version:2}},customer:async()=>({id,version:1})}
 const action=customerSaveIntent('customer.create',{account_kind:'legal_entity',legal_name:'Synthetic'})
 for(let i=0;i<2;i++)await assert.rejects(action.execute(repository),e=>e.code==='internal_safe')
 assert.equal(writes,1)
})
