import test from 'node:test'
import assert from 'node:assert/strict'
import {parseInboxInputV1,parseInboxReceiptV1,parseInboxThreadInputV1,parseInboxThreadResultV1,parseInboxListInputV1}from '../../src/lib/server/inbox-runtime-v1.ts'
import {InboxServiceV1}from '../../src/lib/server/inbox-service-v1.ts'
import {inboxHttpV1}from '../../src/lib/server/inbox-http-v1.ts'
const id='10000000-0000-4000-8000-000000000001',input={command_id:id,id,expected_version:0}
test('Inbox rejects provider/authority injection and oversize private body/history',()=>{
 assert.ok(parseInboxInputV1('conversation.mark_read',input));assert.equal(parseInboxInputV1('conversation.close',input),null)
 for(const extra of [{actor_id:id},{workspace_id:id},{provider_url:'https://example.invalid'},{body:'private'}])assert.equal(parseInboxInputV1('conversation.mark_read',{...input,...extra}),null)
 assert.equal(parseInboxInputV1('message.add_internal_note',{...input,expected_version:1,body:'x'.repeat(2001)}),null)
 assert.equal(parseInboxThreadInputV1({id,limit:51}),null);assert.equal(parseInboxListInputV1({limit:101}),null)
})
test('Inbox receipt binds independent read CAS and exact target',()=>{
 const r={contract_version:'inbox.v1',operation:'conversation.mark_read',command_id:id,id,version:1,status:'read'}
 assert.ok(parseInboxReceiptV1('conversation.mark_read',input,r));assert.equal(parseInboxReceiptV1('conversation.mark_read',input,{...r,version:2}),null)
 assert.equal(parseInboxReceiptV1('conversation.mark_read',input,{...r,provider_status:'sent'}),null)
})
test('Inbox current authority is rechecked before bounded reads',async()=>{
 let role='member';const s=new InboxServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>({data:{contract_version:'inbox.v1',operation:'inbox.unread_summary',unread_count:0},error:null})})
 assert.equal((await s.unread({})).ok,true);role='viewer';assert.equal((await s.unread({})).error,'access_denied')
 assert.equal(parseInboxThreadResultV1({id},{contract_version:'inbox.v1',operation:'inbox.get_thread',conversation:{id},messages:[],next_seq:null,provider_status:'connected'}),null)
})
test('Inbox route rejects external send and generic webhook before constructing authority',async()=>{
 for(const operation of ['message.send','webhook.ingest']){const r=new Request('https://synthetic.invalid/api/inbox/v1',{method:'POST',headers:{host:'synthetic.invalid',origin:'https://synthetic.invalid','content-type':'application/json'},body:JSON.stringify({operation,input:{}})});assert.equal((await inboxHttpV1(r,async()=>{throw Error('must not execute')},'https://synthetic.invalid')).status,400)}
})
