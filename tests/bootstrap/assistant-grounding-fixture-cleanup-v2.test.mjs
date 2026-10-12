import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanupAssistantGroundingFixturesV2} from '../../scripts/security/supabase-local/assistant-grounding-fixture-cleanup-v2.mjs'
test('all three owned cleanups attempted independently and primary failure preserved',async()=>{
 for(const failing of ['case','invoice','equipment','all']){
  const order=[],cleanup=name=>async()=>{order.push(name);if(failing===name||failing==='all')throw Error('private fixture material')}
  const result=await cleanupAssistantGroundingFixturesV2({caseCleanup:cleanup('case'),invoiceCleanup:cleanup('invoice'),equipmentCleanup:cleanup('equipment'),primaryFailure:'W3_READ_GROUNDING_SYNTHETIC_PRIMARY'})
  assert.deepEqual(order,['case','invoice','equipment']);assert.equal(result.failed,true);assert.equal(result.primary_failure,'W3_READ_GROUNDING_SYNTHETIC_PRIMARY')
  for(const name of ['case','invoice','equipment'])assert.equal(result[name+'_status'],failing===name||failing==='all'?'FAIL':'PASS')
  assert.ok(!JSON.stringify(result).includes('private fixture material'));assert.ok(Object.isFrozen(result))
 }
})
test('missing equipment handle is separate from successful absence or cleanups',async()=>{
 const result=await cleanupAssistantGroundingFixturesV2({caseCleanup:async()=>{},invoiceCleanup:async()=>{},equipmentCleanup:null,primaryFailure:null})
 assert.deepEqual(result,{contract:'w3.grounding-owned-fixture-cleanup.v2',case_status:'PASS',invoice_status:'PASS',equipment_status:'NO_OWNED_HANDLE',primary_failure:null,failed:false})
 await assert.rejects(cleanupAssistantGroundingFixturesV2({caseCleanup:null,invoiceCleanup:null,equipmentCleanup:123,primaryFailure:null}),{message:'W3_READ_GROUNDING_CLEANUP_CONFIGURATION'})
})
