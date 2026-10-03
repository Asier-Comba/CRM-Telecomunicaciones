import test from 'node:test'
import assert from 'node:assert/strict'
import { ProductServiceV1 } from '../../src/lib/server/product-service-v1.ts'
import { parseProductInputV1 } from '../../src/lib/server/product-runtime-v1.ts'
const id='10000000-0000-4000-8000-000000000001'
const command='20000000-0000-4000-8000-000000000001'
const input={command_id:command,account_kind:'legal_entity',legal_name:'Synthetic Company'}
function harness({role='owner',error=null,extra={},resolveThrows=false}={}) {
 const calls=[]
 const service=new ProductServiceV1({resolve:async()=>{if(resolveThrows)throw Error('private resolver value');return role===null?null:{workspaceId:id,role}},rpc:async(name,args)=>{
  calls.push({name,args});return {error,data:{contract_version:'product.v1',operation:'customer.create',command_id:command,id,version:1,status:'active',...extra}}
 }})
 return {service,calls}
}
test('normal command projects server workspace; receipt excludes PII and authority',async()=>{
 const {service,calls}=harness();assert.equal((await service.execute('customer.create',input)).ok,true)
 assert.deepEqual(calls,[{name:'product_v1_customer_create',args:{p_workspace_id:id,p_input:input}}])
})
for(const key of ['workspace_id','created_by','actor_id','status','source','tax_identifier','storage_path']) test(`mass assignment ${key} denied before DB`,async()=>{
 const {service,calls}=harness();assert.deepEqual(await service.execute('customer.create',{...input,[key]:id}),{ok:false,error:'validation'});assert.equal(calls.length,0)
})
for(const role of ['viewer','member',null])test(`role ${role} cannot mutate`,async()=>{
 const {service,calls}=harness({role});assert.deepEqual(await service.execute('customer.create',input),{ok:false,error:'access_denied'});assert.equal(calls.length,0)
})
test('hostile values, malformed UUID, unknown operation and oversize fail closed',async()=>{
 const {service,calls}=harness()
 for(const value of [null,[],new Date(),{...input,command_id:'foreign'},{...input,legal_name:'x'.repeat(201)},{...input,legal_name:'x\n'},{...input,assigned_user_id:3}]) assert.equal((await service.execute('customer.create',value)).error,'validation')
 const getter={...input};Object.defineProperty(getter,'legal_name',{get(){throw Error('getter executed')}})
 assert.equal(parseProductInputV1('customer.create',getter),null)
 assert.equal(parseProductInputV1('customer.create',new Proxy({}, {getPrototypeOf(){throw Error('proxy')}})),null)
 assert.equal((await service.execute('assistant.execute',input)).error,'validation');assert.equal(calls.length,0)
})
test('raw errors and private output never cross service boundary',async()=>{
 for(const code of ['42501','P0002','40001','23505','22023','unknown']){
 const {service}=harness({error:{code,message:'private provider error'}})
 assert.doesNotMatch(JSON.stringify(await service.execute('customer.create',input)),/private|provider/)
 }
 for(const extra of [{email:'private@example.invalid'},{workspace_id:id},{operation:'contact.create'},{command_id:id},{version:2},{status:'archived'}]) {
 const {service}=harness({extra});assert.deepEqual(await service.execute('customer.create',input),{ok:false,error:'internal_safe'})
 }
})
test('updates require a positive safe expected version and correct returned identity',()=>{
 for(const version of [0,-1,1.5,NaN,Infinity,1e15]) assert.equal(parseProductInputV1('customer.update',{command_id:command,id,expected_version:version,legal_name:'Synthetic'}),null)
})
test('contact identity is distinct and email is explicitly validated',()=>{
 assert.ok(parseProductInputV1('contact.create',{command_id:command,customer_id:id,display_name:'Synthetic Contact',email:'contact@example.invalid',phone:null}))
 for(const email of ['bad','x@y','x @example.invalid',3])assert.equal(parseProductInputV1('contact.create',{command_id:command,customer_id:id,display_name:'Synthetic Contact',email}),null)
})
import { parseCustomerEditorV1, parseContactEditorPageV1 } from '../../src/lib/server/product-runtime-v1.ts'
test('editor returns CAS version without fiscal identity or authority',()=>{
 const row={contract_version:'product.v1',id,version:2,account_kind:'legal_entity',legal_name:'Synthetic',trade_name:null,lifecycle:'prospect',status:'active',source:'manual',assigned_user_id:null}
 assert.ok(parseCustomerEditorV1(id,row))
 for(const patch of [{tax_identifier:'private'},{workspace_id:id},{id:command},{version:0}])assert.equal(parseCustomerEditorV1(id,{...row,...patch}),null)
})
test('contact editor validates closed PII fields, order, cursor and limit',()=>{
 const row={id,version:1,display_name:'Synthetic',job_title:null,email:'contact@example.invalid',phone:null,is_primary:false,status:'active'}
 const page={contract_version:'product.v1',customer_id:command,items:[row],next_id:null}
 assert.ok(parseContactEditorPageV1(command,1,null,page))
 for(const bad of [{...page,items:[{...row,raw_path:'private'}]},{...page,items:[row,row]},{...page,next_id:command},{...page,customer_id:id},{...page,items:[{...row,is_primary:true,status:'archived'}]}])assert.equal(parseContactEditorPageV1(command,1,null,bad),null)
 assert.equal(parseContactEditorPageV1(command,1,id,page),null)
})
