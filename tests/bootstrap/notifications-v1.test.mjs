import test from 'node:test'
import assert from 'node:assert/strict'
import {parseNotificationInputV1,parseNotificationReceiptV1,parseNotificationListInputV1,parseNotificationListV1}from '../../src/lib/server/notifications-runtime-v1.ts'
import {NotificationServiceV1}from '../../src/lib/server/notifications-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001',i={command_id:id,expected_version:0}
test('notifications cannot choose recipient or arbitrary link, and pages are bounded',()=>{
 for(const v of [{...i,recipient_user_id:id},{...i,url:'https://example.invalid'},{...i,expected_version:-1}])assert.equal(parseNotificationInputV1('notification.refresh',v),null)
 assert.equal(parseNotificationListInputV1({limit:101}),null)
 const n={id,kind:'task_overdue',title:'Tarea vencida',summary:'Revise el registro autorizado.',target:{kind:'task',id},created_at:'2026-10-05T00:00:00Z',read_at:null},page={contract_version:'notifications.v1',operation:'notification.list',version:1,items:[n],next_id:null};assert.ok(parseNotificationListV1({},page));assert.equal(parseNotificationListV1({},{...page,items:[{...n,target:{kind:'url',id:'https://example.invalid'}}]}),null)
})
test('notification receipt reports actual event increments and bounded remaining batch honestly',()=>{
 const r={contract_version:'notifications.v1',operation:'notification.refresh',command_id:id,version:3,affected:2,has_more:false};assert.ok(parseNotificationReceiptV1('notification.refresh',i,r));assert.equal(parseNotificationReceiptV1('notification.refresh',i,{...r,version:1}),null)
 assert.equal(parseNotificationReceiptV1('notification.refresh',i,{...r,affected:101}),null)
})
test('notifications recheck current member and never accept viewer elevation',async()=>{
 let role='member';const s=new NotificationServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>({data:{contract_version:'notifications.v1',operation:'notification.unread_count',version:0,unread_count:0},error:null})});assert.equal((await s.count({})).ok,true);role='viewer';assert.equal((await s.count({})).error,'access_denied')
})
