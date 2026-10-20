import {test} from 'node:test'
import assert from 'node:assert/strict'
import {preflight,origin,projectRef,siteId} from './preflight.mjs'
// These fixtures exercise the local runner boundary only; no cloud/browser/DB dispatch.
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='10000000-0000-4000-8000-000000000003',d='10000000-0000-4000-8000-000000000004'
const now=Date.parse('2026-10-20T00:00:00Z'),ref='https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-1'
const fixture=()=>({version:2,windowId:a,candidateSha:'a'.repeat(40),deploymentSourceSha:'a'.repeat(40),deployId:'fixture-only',siteId,origin,projectRef,expiresAt:'2026-10-20T01:00:00Z',dataClassification:'synthetic',integratorReviewRef:ref,cloudWindowRef:ref,deploymentEvidenceRef:ref,browserBinding:'DEDICATED_W5_APPROVED_CONTEXT',actorA:{id:a,workspaceId:a,role:'member',customerId:a},actorB:{id:b,workspaceId:b,role:'viewer',customerId:c,invoiceId:d}})
const env={OIER_CLOUD_QA_APPROVED_WRITES:'true',OIER_CLOUD_QA_A_EMAIL:'qa-a@example.invalid',OIER_CLOUD_QA_A_PASSWORD:'fixture-only',OIER_CLOUD_QA_B_EMAIL:'qa-b@example.invalid',OIER_CLOUD_QA_B_PASSWORD:'fixture-only',OIER_CLOUD_QA_CDP_URL:'http://127.0.0.1:9222'}
test('missing manifest and missing explicit approval cannot dispatch',()=>{assert.equal(preflight(null,{},now).ok,false);assert.equal(preflight(fixture(),{...env,OIER_CLOUD_QA_APPROVED_WRITES:undefined},now).ok,false)})
test('production/other projects and mismatched SHA are refused',()=>{for(const [key,value] of [['origin','https://example.com'],['projectRef','another-project'],['deploymentSourceSha','b'.repeat(40)]])assert.equal(preflight({...fixture(),[key]:value},env,now).ok,false)})
test('expired window, same tenant, real-address domain and remote browser are refused',()=>{
 assert.equal(preflight({...fixture(),expiresAt:'2026-10-19T00:00:00Z'},env,now).ok,false)
 const m=fixture();m.actorB.workspaceId=m.actorA.workspaceId;assert.equal(preflight(m,env,now).ok,false)
 for(const changed of [{OIER_CLOUD_QA_A_EMAIL:'qa@example.com'},{OIER_CLOUD_QA_CDP_URL:'http://example.com:9222'},{DEBUG:'pw:protocol'}])assert.equal(preflight(fixture(),{...env,...changed},now).ok,false)
})
test('complete synthetic input is only readiness, never deployment/owner/cloud proof',()=>{assert.deepEqual(preflight(fixture(),env,now),{ok:true,codes:[]});assert.equal(preflight({...fixture(),unapprovedField:true},env,now).ok,false)})
test('missing roles, A viewer and missing/distinct baseline customer are refused before writes',()=>{
 for(const change of [a=>delete a.role,a=>a.role='viewer',a=>delete a.customerId,a=>a.customerId=c]){
  const m=fixture();change(m.actorA);assert.equal(preflight(m,env,now).ok,false)
 }
})
