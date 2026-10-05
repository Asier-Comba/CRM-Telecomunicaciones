import test from 'node:test'
import assert from 'node:assert/strict'
import {parseTeamInputV1,parseTeamReceiptV1,parseTeamListInputV1,parseTeamListV1}from '../../src/lib/server/team-runtime-v1.ts'
import {TeamServiceV1}from '../../src/lib/server/team-service-v1.ts'
import {teamHttpV1}from '../../src/lib/server/team-http-v1.ts'
const id='10000000-0000-4000-8000-000000000001'
const cas={command_id:id,id,expected_version:1}
test('team closed schemas refuse owner role, authority, missing CAS, PII excess and hostile getters',()=>{
 assert.ok(parseTeamInputV1('member.role_change',{...cas,role:'viewer'}))
 for(const v of [{...cas,role:'owner'},{...cas,role:'member',workspace_id:id},{...cas,role:'member',expected_version:0}])assert.equal(parseTeamInputV1('member.role_change',v),null)
 assert.ok(parseTeamInputV1('member.invite_intent',{command_id:id,email:'synthetic@example.invalid',role:'member'}))
 for(const email of ['Bad@EXAMPLE.invalid','x\n@example.invalid','no-domain'])assert.equal(parseTeamInputV1('member.invite_intent',{command_id:id,email,role:'member'}),null)
 let reads=0;const hostile={...cas};Object.defineProperty(hostile,'role',{enumerable:true,get(){reads++;return 'member'}});assert.equal(parseTeamInputV1('member.role_change',hostile),null);assert.equal(reads,0)
 const receipt={contract_version:'team.v1',operation:'member.suspend',command_id:id,id,version:2,status:'suspended'}
 assert.ok(parseTeamReceiptV1('member.suspend',cas,receipt));assert.equal(parseTeamReceiptV1('member.suspend',cas,{...receipt,email:'private'}),null);assert.equal(parseTeamReceiptV1('member.suspend',cas,{...receipt,version:1}),null)
})
test('team roster is bounded, stably ordered and does not accept auth/profile PII',()=>{
 assert.equal(parseTeamListInputV1({limit:101}),null);assert.equal(parseTeamListInputV1({workspace_id:id}),null)
 const row={id,user_id:id,role:'member',status:'active',version:1};const response={contract_version:'team.v1',operation:'member.list',items:[row],next_id:null}
 assert.ok(parseTeamListV1({},response))
 for(const items of [[{...row,email:'private'}],[row,row],[{...row,status:'invented'}]])assert.equal(parseTeamListV1({}, {...response,items}),null)
 let reads=0;const items=[];Object.defineProperty(items,'0',{enumerable:true,get(){reads++;return row}});assert.equal(parseTeamListV1({}, {...response,items}),null);assert.equal(reads,0)
})
test('team service denies commercial roles/admin escalation and minimizes DB conflict details',async()=>{
 for(const role of ['member','viewer','admin']){let calls=0;const service=new TeamServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>{calls++;throw Error('private')}});const result=await service.execute('member.invite_intent',{command_id:id,email:'synthetic@example.invalid',role:role==='admin'?'admin':'member'});assert.deepEqual(result,{ok:false,error:'access_denied'});assert.equal(calls,0)}
 const service=new TeamServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({data:null,error:{code:'40001',message:'private'}})});assert.deepEqual(await service.execute('member.suspend',cas),{ok:false,error:'conflict'})
})
test('team transport requires canonical Origin/Host and supplies no caller principal to RPC',async()=>{
 let calls=0;const factory=async()=>new TeamServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async(name,args)=>{calls++;assert.equal(name,'team_v1_member_suspend');assert.equal(args.p_workspace_id,id);return {error:null,data:{contract_version:'team.v1',operation:'member.suspend',command_id:id,id,version:2,status:'suspended'}}}})
 const req=(input,origin='http://localhost')=>new Request('http://localhost/api/team/v1/commands',{method:'POST',headers:{origin,host:'localhost','content-type':'application/json'},body:JSON.stringify({operation:'member.suspend',input})})
 assert.equal((await teamHttpV1(req(cas),'commands',factory,'http://localhost')).status,200)
 assert.equal((await teamHttpV1(req({...cas,workspace_id:id}),'commands',factory,'http://localhost')).status,400)
 assert.equal((await teamHttpV1(req(cas,'https://foreign.invalid'),'commands',factory,'http://localhost')).status,403);assert.equal(calls,1)
})
