import test from 'node:test'
import assert from 'node:assert/strict'
import {parseProvenanceInputV1,parseProvenanceResultV1}from '../../src/lib/server/provenance-runtime-v1.ts'
import {ProvenanceServiceV1}from '../../src/lib/server/provenance-service-v1.ts'
import {parseTeamInputV1,parseTeamReceiptV1,parseTeamInviteListV1}from '../../src/lib/server/team-runtime-v1.ts'
const id='10000000-0000-4000-8000-000000000001',i={kind:'customer',id}
test('new manual proof cannot relabel external or certify legacy without a timestamp',()=>{
 assert.ok(parseProvenanceInputV1(i));assert.equal(parseProvenanceInputV1({...i,kind:'table'}),null)
 const dto={contract_version:'provenance.v1',operation:'provenance.get',...i,declared_source:'manual',confidence:'declared_legacy_manual',verified_at:null};assert.ok(parseProvenanceResultV1(i,dto));assert.equal(parseProvenanceResultV1(i,{...dto,confidence:'verified_new_manual'}),null);assert.equal(parseProvenanceResultV1(i,{...dto,declared_source:'import',confidence:'verified_new_manual',verified_at:'2026-10-05T00:00:00Z'}),null)
})
test('origin reads recheck current protected membership before RPC',async()=>{
 for(const role of ['member','viewer']){const s=new ProvenanceServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>{throw Error('must not run')}});assert.equal((await s.get(i)).error,'access_denied')}
})
test('reissue uses closed CAS input and expiry receipt while invite list bounds output',()=>{
 const input={command_id:id,id,expected_version:1};assert.ok(parseTeamInputV1('member.reissue_invite',input));assert.equal(parseTeamInputV1('member.reissue_invite',{...input,email:'changed@example.invalid'}),null)
 const receipt={contract_version:'team.v1',operation:'member.reissue_invite',command_id:id,id,version:2,status:'pending',expires_at:'2026-10-12T00:00:00Z'};assert.ok(parseTeamReceiptV1('member.reissue_invite',input,receipt));assert.equal(parseTeamReceiptV1('member.reissue_invite',input,{...receipt,expires_at:'invalid'}),null)
 assert.equal(parseTeamInviteListV1({limit:1},{contract_version:'team.v1',operation:'member.invite_list',items:[{},{}],next_id:null}),null)
})
