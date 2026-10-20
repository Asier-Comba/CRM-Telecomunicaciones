import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'

const attempt=process.env.OIER_REGRESSION_ATTEMPT
if(!attempt||!/^billing-regression-attempt\d{2}$/.test(attempt))throw Error('Set a new OIER_REGRESSION_ATTEMPT; preserve earlier results')
const output=resolve(__dirname,'../../../oier-billing-fixes-20261020',attempt)
export default defineConfig({
 testDir:resolve(__dirname,'../../tests/e2e-preview'),
 testMatch:[
  'billing-current-selection.spec.ts',
  'billing-initial-context.spec.ts',
  'billing-financial-refresh.spec.ts',
  'billing-uncertain-intent.spec.ts',
  'billing-invalid-receipt.spec.ts',
  'billing-receipt-read-boundary.spec.ts',
  'billing-refresh-focus.spec.ts',
 ],
 workers:1,fullyParallel:false,retries:0,timeout:45000,expect:{timeout:4000},
 outputDir:resolve(output,'artifacts'),
 reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],
 use:{browserName:'chromium',timezoneId:'Europe/Madrid',viewport:{width:1440,height:960},screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:[{name:'controlled-http-existing-billing'}],
})
