import {defineConfig} from '@playwright/test'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
const output=process.env.ASIER63_REGRESSION_OUTPUT
if(!output||process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('NEW_REGRESSION_OUTPUT_REQUIRED')
export default defineConfig({testDir:'../../tests/e2e-preview',testMatch:['billing-uncertain-intent.spec.ts','billing-invalid-receipt.spec.ts','billing-receipt-read-boundary.spec.ts','billing-initial-context.spec.ts','billing-preparation-context.spec.ts','billing-current-selection.spec.ts','billing-current-invoice-step.spec.ts','billing-financial-refresh.spec.ts','billing-refresh-focus.spec.ts','pipeline-current-query.spec.ts','pipeline-catalog-recovery.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:5000},outputDir:resolve(output,'browser'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'}})
