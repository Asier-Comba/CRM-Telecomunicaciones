import test from'node:test'
import assert from'node:assert/strict'
import{parseTelecomCollectionInputV1 as input,parseTelecomCollectionResultV1 as result}from'../../src/lib/server/telecom-collection-runtime-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002'
const task={id,version:1,customer_id:id,opportunity_id:null,title:'Synthetic Undated Task',status:'completed',priority:null,assigned_user_id:null,due_at:null,due_on:null}
const meeting={id,version:1,customer_id:id,opportunity_id:null,title:'Synthetic Completed Meeting',status:'completed',assigned_user_id:null,starts_at:'2026-10-05T23:00:00Z',starts_on:'2026-10-06',ends_at:'2026-10-06T00:00:00Z',timezone:'Europe/Madrid',all_day:false,channel:'video'}
const page=(operation,row,patch={})=>({contract_version:'telecom.collections.v1',operation,items:[row],next_id:null,...patch})
test('full work collection filters keep undated and historical records while closing arbitrary priority and dates',()=>{
 assert.ok(input('task.list',{customer_id:id,status:'completed'}));assert.ok(input('meeting.list',{status:'no_show',date_from:'2026-10-01',date_to:'2026-10-31'}))
 for(const [op,value]of[['task.list',{priority:'urgent'}],['task.list',{date_from:'2026-10-01'}],['meeting.list',{date_from:'2026-02-31',date_to:'2026-03-01'}],['meeting.list',{limit:101}],['task.list',{body:'private'}]])assert.equal(input(op,value),null)
 assert.ok(result('task.list',{customer_id:id,status:'completed'},page('task.list',task)))
 assert.equal(result('task.list',{date_from:'2026-10-01',date_to:'2026-10-31'},page('task.list',task)),null)
})
test('work collection DTOs preserve Madrid date derivation and reject fake date or private identity fields',()=>{
 assert.ok(result('meeting.list',{},page('meeting.list',meeting)))
 for(const patch of[{starts_on:'2026-10-05'},{ends_at:meeting.starts_at},{timezone:'invented/private'},{phone:'private'},{canonical_value:'+12025550187'}])assert.equal(result('meeting.list',{},page('meeting.list',{...meeting,...patch})),null)
 assert.equal(result('task.list',{},page('task.list',{...task,due_at:'2026-10-05T23:00:00Z',due_on:null})),null)
 assert.equal(result('task.list',{},page('task.list',{...task,customer_id:null,opportunity_id:id})),null)
})
test('work collection pages validate scoped identities complete cursor and unique ascending keyset',()=>{
 assert.ok(result('task.list',{limit:1},page('task.list',task,{next_id:id})))
 assert.equal(result('task.list',{customer_id:other},page('task.list',task)),null);assert.equal(result('task.list',{opportunity_id:other},page('task.list',task)),null)
 assert.equal(result('task.list',{limit:1},page('task.list',task,{next_id:other})),null)
 assert.equal(result('task.list',{after_id:id},page('task.list',task)),null)
 assert.equal(result('task.list',{},page('task.list',task,{items:[task,task]})),null)
})
