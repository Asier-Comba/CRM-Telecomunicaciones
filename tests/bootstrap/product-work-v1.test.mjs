import test from 'node:test'
import assert from 'node:assert/strict'
import { ProductServiceV1 } from '../../src/lib/server/product-service-v1.ts'
import { parseProductInputV1,parseProductReceiptV1 } from '../../src/lib/server/product-runtime-v1.ts'
import { WORK_RPC_V1 } from '../../src/lib/server/product-work-runtime-v1.ts'
import { parseCalendarInputV1,parseCalendarPageV1,parseWorkGetV1,snapshotProductJsonV1 } from '../../src/lib/server/product-query-runtime-v1.ts'
const id='10000000-0000-4000-8000-000000000001',command='20000000-0000-4000-8000-000000000001'
const valid={
 'task.create':{command_id:command,title:'Synthetic task'},'task.update':{command_id:command,id,expected_version:1,title:'Updated'},
 'meeting.create':{command_id:command,title:'Synthetic meeting',starts_at:'2026-10-25T02:30:00+02:00',timezone:'Europe/Madrid'},'meeting.update':{command_id:command,id,expected_version:1,title:'Updated'},'meeting.reschedule':{command_id:command,id,expected_version:1,starts_at:'2026-10-25T02:30:00+02:00',ends_at:'2026-10-25T02:30:00+01:00'},
 'opportunity.create':{command_id:command,title:'Synthetic opportunity',customer_id:id,stage_id:id},'opportunity.update':{command_id:command,id,expected_version:1,amount_minor:10000,currency:'EUR'},'opportunity.assign':{command_id:command,id,expected_version:1,owner_user_id:id},
}
for(const op of Object.keys(WORK_RPC_V1)){
 const input=valid[op]??{command_id:command,id,expected_version:1,...(/\.(win|lose|reopen|change_stage)$/.test(op)&&op.startsWith('opportunity.')?{stage_id:id}:{}),...(op.endsWith('.lose')?{close_reason_code:'price'}:{})}
 test(`${op} validates its closed input; rejects authority and hostile runtime`,()=>{
  assert.ok(parseProductInputV1(op,input))
  for(const bad of [{...input,workspace_id:id},{...input,status:'won'},{...input,version:5},{...input,command_id:[]},null,new Date(),new Proxy({},{getPrototypeOf(){throw Error('hostile')}})])assert.equal(parseProductInputV1(op,bad),null)
 })
}
test('member product policy enables work and identity while viewer remains denied',async()=>{
 for(const role of ['member','viewer']){
  let calls=0
  const service=new ProductServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async(name)=>{calls++;const customer=name==='product_v1_customer_create';return {error:null,data:{contract_version:'product.v1',command_id:command,operation:customer?'customer.create':'task.create',id,version:1,status:customer?'active':'pending'}}}})
  assert.equal((await service.execute('task.create',valid['task.create'])).ok,role==='member')
  assert.equal((await service.execute('customer.create',{command_id:command,account_kind:'legal_entity',legal_name:'Synthetic'})).ok,role==='member')
  assert.equal(calls,role==='member'?2:0)
 }
})
test('strict instants distinguish fall DST offsets, reject rollover, missing offset and equal range',()=>{
 assert.ok(parseProductInputV1('meeting.reschedule',valid['meeting.reschedule']))
 for(const stamp of ['2026-02-30T00:00:00Z','2026-10-25T02:30:00','2026-10-25T02:30:00+14:01','2026-10-25T24:00:00Z'])assert.equal(parseProductInputV1('meeting.create',{...valid['meeting.create'],starts_at:stamp}),null)
 assert.equal(parseProductInputV1('meeting.create',{...valid['meeting.create'],ends_at:valid['meeting.create'].starts_at}),null)
 assert.equal(parseProductInputV1('opportunity.update',{...valid['opportunity.update'],currency:undefined}),null)
 for(const amount of [-1,NaN,Infinity,1e15,1.1])assert.equal(parseProductInputV1('opportunity.update',{...valid['opportunity.update'],amount_minor:amount}),null)
})
const window={range_start:'2026-03-29T00:00:00Z',range_end:'2026-03-30T00:00:00Z',limit:1}
const meeting={kind:'meeting',id,version:1,title:'Long meeting',status:'scheduled',customer_id:null,assigned_user_id:null,at:'2026-03-28T00:00:00+00:00',ends_at:'2026-03-31T00:00:00+00:00',all_day:false,date:null}
test('calendar validates actual overlap, stable closed cursors and bounded ranges',()=>{
 assert.ok(parseCalendarInputV1(window))
 assert.equal(parseCalendarInputV1({...window,range_end:'2027-01-01T00:00:00Z'}),null)
 assert.equal(parseCalendarInputV1({...window,after_id:id}),null)
 assert.ok(parseCalendarPageV1(window,{contract_version:'product.v1',items:[meeting],next:null}))
 for(const record of [{...meeting,ends_at:window.range_start},{...meeting,storage_path:'private'},{...meeting,customer_id:5},{...meeting,version:0}])assert.equal(parseCalendarPageV1(window,{contract_version:'product.v1',items:[record],next:null}),null)
 assert.equal(parseCalendarPageV1({...window,limit:2},{contract_version:'product.v1',items:[meeting,meeting],next:null}),null)
})
test('receipt cannot fake completed effect, identity or CAS version',()=>{
 const input={command_id:command,id,expected_version:1}
 const r={contract_version:'product.v1',operation:'task.complete',command_id:command,id,version:2,status:'completed'}
 assert.ok(parseProductReceiptV1('task.complete',input,r))
 for(const patch of [{status:'pending'},{id:command},{version:1},{actor_id:id}])assert.equal(parseProductReceiptV1('task.complete',input,{...r,...patch}),null)
})
test('getter arrays, cycles, symbols and output authority fail closed without getter execution',()=>{
 let calls=0;const values=[];Object.defineProperty(values,'0',{enumerable:true,get(){calls++;return meeting}})
 assert.equal(parseCalendarPageV1(window,{contract_version:'product.v1',items:values,next:null}),null);assert.equal(calls,0)
 const circular={};circular.self=circular;assert.throws(()=>snapshotProductJsonV1(circular))
 const record={id,version:1,title:'Task',status:'pending',customer_id:null,opportunity_id:null,due_at:null,priority:null,assigned_user_id:null}
 assert.ok(parseWorkGetV1('task',id,{contract_version:'product.v1',kind:'task',record}))
 assert.equal(parseWorkGetV1('task',id,{contract_version:'product.v1',kind:'task',record:{...record,email:'private'}}),null)
})
