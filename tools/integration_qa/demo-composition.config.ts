import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_DEMO_COMPOSITION_ATTEMPT
if(!attempt||!/^composition-attempt\d{2}$/.test(attempt))throw Error('Unique demo composition attempt required')
const output=resolve(__dirname,'../../../qa-demo28',attempt)
export default defineConfig({testDir:resolve(__dirname,'../..'),workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[
 {name:'existing-width-cases',testMatch:['**/tests/e2e-preview/billing-preparation-context.spec.ts','**/tests/e2e-preview/billing-initial-context.spec.ts','**/tests/e2e-preview/portfolio-selection-race.spec.ts','**/tests/e2e-preview/portfolio-reference-close.spec.ts']},
 ...[390,768,1440].map(width=>({name:`owner-controls-${width}`,testMatch:['**/tools/oier_billing_qa/prompt-interaction.spec.ts','**/tools/oier_commercial_qa/portfolio-feedback.spec.ts'],use:{viewport:{width,height:960}}})),
]})
