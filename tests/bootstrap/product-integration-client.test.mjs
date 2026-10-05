import test from 'node:test'
import assert from 'node:assert/strict'
import { integratedLocalAllowed } from '../../src/features/product/integration/mode.ts'
import { IntegratedLocalProductRepository, SyntheticProductRepository, ProductUiError, commandIntent } from '../../src/features/product/integration/repository.ts'
const env={ NODE_ENV:'development', PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',PRODUCT_V1_ORIGIN:'http://127.0.0.1:3108' }
test('local integration requires every opt-in and canonical loopback URLs',()=>{
 assert.equal(integratedLocalAllowed(env),true)
 for(const key of ['PRODUCT_LOCAL_INTEGRATION','PRODUCT_LOCAL_SYNTHETIC','PRODUCT_V1_ENABLED'])assert.equal(integratedLocalAllowed({...env,[key]:undefined}),false)
 for(const patch of [{NODE_ENV:'production'},{NEXT_PUBLIC_SUPABASE_URL:'https://remote.supabase.co'},{PRODUCT_V1_ORIGIN:'http://localhost:3108/path'},{NEXT_PUBLIC_SUPABASE_URL:'http://localhost.attacker.invalid:54321'},{PRODUCT_V1_ORIGIN:'http://user:password@localhost:3108'}])assert.equal(integratedLocalAllowed({...env,...patch}),false)
})
test('a timeout retry preserves exact command_id and payload; new intent has a fresh ID',async()=>{
 const calls=[];let attempt=0
 const repository=new IntegratedLocalProductRepository(async(path,init)=>{
  const body=JSON.parse(init.body);calls.push(body);assert.equal(path,'/api/product/v1/commands');assert.equal(init.credentials,'same-origin')
  if(attempt++===0)throw Error('private network detail')
  return Response.json({ok:true,receipt:{contract_version:'product.v1',operation:body.operation,command_id:body.input.command_id,id:'10000000-0000-4000-8000-000000000001',version:1,status:'active'}})
 })
 const intent=commandIntent('customer.create',{account_kind:'legal_entity',legal_name:'Synthetic'})
 await assert.rejects(intent.execute(repository),e=>e instanceof ProductUiError && e.code==='transport_uncertain')
 await intent.execute(repository);assert.deepEqual(calls[0],calls[1]);assert.notEqual(commandIntent('customer.create',{account_kind:'legal_entity',legal_name:'Synthetic'}).input.command_id,intent.input.command_id)
})
test('malformed success, unexpected authority fields and unsafe errors fail closed',async()=>{
 for(const value of [{ok:true,data:{}},{ok:true,data:{},workspace_id:'private'},{ok:false,error:'SQLSTATE-private'},{ok:false,error:'conflict',stack:'private'}]){
  const repository=new IntegratedLocalProductRepository(async()=>Response.json(value))
  await assert.rejects(repository.customer('10000000-0000-4000-8000-000000000001'),e=>e.code==='internal_safe' && !e.message.includes('private'))
 }
 const conflict=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'conflict'},{status:409}))
 await assert.rejects(conflict.customer('10000000-0000-4000-8000-000000000001'),e=>e.code==='conflict')
})
test('synthetic implementation never simulates a persistent receipt',async()=>{
 await assert.rejects(commandIntent('customer.create',{account_kind:'legal_entity',legal_name:'Synthetic'}).execute(new SyntheticProductRepository()),e=>e.code==='unavailable')
})
test('browser fetch retains the global receiver instead of the repository instance',async()=>{
 const repository=new IntegratedLocalProductRepository(function(){assert.equal(this,globalThis);return Promise.resolve(Response.json({ok:false,error:'access_denied'},{status:403}))})
 await assert.rejects(repository.customer('10000000-0000-4000-8000-000000000001'),e=>e.code==='access_denied')
})
test('document upload parser rejects leaked locators and keeps finalization explicit',async()=>{
 const id='10000000-0000-4000-8000-000000000001',file=new File(['synthetic'],'sample.png',{type:'image/png'})
 for(const data of [{id,uploaded:true,finalized:true},{id,uploaded:true,finalized:false,path:'private-locator'}]){
  const r=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data}));await assert.rejects(r.uploadDocument(id,file),e=>e.code==='internal_safe')
 }
 let uploaded=false
 const r=new IntegratedLocalProductRepository(async(path,init)=>{assert.equal(path,'/api/document/v1/content/upload?id='+id);assert.equal(init.body,file);assert.equal(init.credentials,'same-origin');uploaded=true;return Response.json({ok:true,data:{id,uploaded:true,finalized:false}})})
 await r.uploadDocument(id,file);assert.equal(uploaded,true)
})
test('document proxy download refuses unsafe content types and preserves revoked access denial',async()=>{
 const id='10000000-0000-4000-8000-000000000001'
 const unsafe=new IntegratedLocalProductRepository(async()=>new Response('<html>',{headers:{'Content-Type':'text/html'}}))
 await assert.rejects(unsafe.downloadDocument(id,id),e=>e.code==='internal_safe')
 const revoked=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'access_denied'},{status:403}))
 await assert.rejects(revoked.downloadDocument(id,id),e=>e.code==='access_denied')
})
