import {expect,test} from '@playwright/test'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {resolve} from 'node:path'
const run=promisify(execFile)
test('real C360 consumer records aborted actions without orphaned response rejections',async()=>{
 const result=await run(process.execPath,[resolve('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs')],{timeout:30000,maxBuffer:64*1024})
 const lines=result.stdout.trim().split(/\r?\n/),proof=JSON.parse(lines.at(-1)!)
 expect(proof.kind).toBe('C360_RESPONSE_WAITER_FAILURE_LIFETIME_SYNTHETIC_ONLY')
 expect(proof.auth_db).toBe('NOT_RUN');expect(proof.unhandled).toEqual([]);expect(proof.passed).toEqual([])
 expect(proof.failureKinds).toContainEqual({check:'customer360_exact_summary_safe_contacts_independent_domains',kind:'TimeoutError'})
 expect(proof.failed).toEqual(expect.arrayContaining(['customer360_exact_summary_safe_contacts_independent_domains','customer360_undated_completed_tasks_cursor_filter_navigation','customer360_loaded_telecom_desktop_tablet_mobile','customer360_contact_lost_receipt_keeps_intent_and_single_persisted_effect']))
})
