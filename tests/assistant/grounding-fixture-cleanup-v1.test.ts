import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cleanupAssistantGroundingFixturesV1} from '../../scripts/security/supabase-local/assistant-grounding-fixture-cleanup-v1.mjs'
test('case cleanup failure cannot skip invoice cleanup or disclose raw errors; primary enum retained',async()=>{
 let invoices=0
 const result=await cleanupAssistantGroundingFixturesV1({caseCleanup:async()=>{throw Error('private fixture material')},invoiceCleanup:async()=>{invoices++},primaryFailure:'W3_READ_GROUNDING_CASE_SETUP'})
 assert.equal(invoices,1);assert.equal(result.case_status,'FAIL');assert.equal(result.invoice_status,'PASS')
 assert.equal(result.primary_failure,'W3_READ_GROUNDING_CASE_SETUP');assert.equal(result.failed,true)
 assert.ok(Object.isFrozen(result));assert.ok(!JSON.stringify(result).includes('private fixture material'))
})
test('both cleanup failures remain distinct and do not erase the primary failure',async()=>{
 let cases=0,invoices=0
 const result=await cleanupAssistantGroundingFixturesV1({caseCleanup:async()=>{cases++;throw Error('private case')},invoiceCleanup:async()=>{invoices++;throw Error('private invoice')},primaryFailure:'W3_READ_GROUNDING_EVIDENCE'})
 assert.equal(cases,1);assert.equal(invoices,1);assert.equal(result.case_status,'FAIL');assert.equal(result.invoice_status,'FAIL')
 assert.equal(result.primary_failure,'W3_READ_GROUNDING_EVIDENCE');assert.equal(result.failed,true)
})
test('failed case setup with no owned case still cleans its earlier invoice fixture',async()=>{
 let invoices=0
 const result=await cleanupAssistantGroundingFixturesV1({caseCleanup:null,invoiceCleanup:async()=>{invoices++},primaryFailure:'W3_READ_GROUNDING_CASE_FIXTURE_SETUP'})
 assert.equal(invoices,1);assert.equal(result.case_status,'NO_OWNED_HANDLE');assert.equal(result.invoice_status,'PASS')
 assert.equal(result.failed,false);assert.equal(result.primary_failure,'W3_READ_GROUNDING_CASE_FIXTURE_SETUP')
})
