import assert from 'node:assert/strict'
import test from 'node:test'
import {cleanupAssistantGroundingFixturesV3} from '../../scripts/security/supabase-local/assistant-grounding-fixture-cleanup-v3.mjs'
test('four owned grounding cleanups all run after primary failure and multiple callback failures, without raw errors',async()=>{
 const calls=[];const cleanup=name=>async()=>{calls.push(name);if(name==='case'||name==='document')throw Error('PRIVATE_FIXTURE_DETAIL')}
 const result=await cleanupAssistantGroundingFixturesV3({caseCleanup:cleanup('case'),invoiceCleanup:cleanup('invoice'),equipmentCleanup:cleanup('equipment'),documentCleanup:cleanup('document'),primaryFailure:'W3_READ_GROUNDING_DOCUMENT_REVOCATION'})
 assert.deepEqual(calls,['case','invoice','equipment','document']);assert.deepEqual(result,{contract:'w3.grounding-owned-fixture-cleanup.v3',case_status:'FAIL',invoice_status:'PASS',equipment_status:'PASS',document_status:'FAIL',primary_failure:'W3_READ_GROUNDING_DOCUMENT_REVOCATION',failed:true});assert.ok(Object.isFrozen(result));assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE'))
})
test('no owned document handle is distinguished from absence or an actual cleanup pass',async()=>{
 const result=await cleanupAssistantGroundingFixturesV3({caseCleanup:null,invoiceCleanup:null,equipmentCleanup:null,documentCleanup:null,primaryFailure:null})
 assert.equal(result.document_status,'NO_OWNED_HANDLE');assert.equal(result.failed,false);assert.equal(Object.keys(result).length,7)
 await assert.rejects(cleanupAssistantGroundingFixturesV3({caseCleanup:null,invoiceCleanup:null,equipmentCleanup:null,documentCleanup:true,primaryFailure:null}),/CONFIGURATION/)
})
