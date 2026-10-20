import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_SELECTION_ATTEMPT
if(!attempt||!/^selection-(before|after)\d{2}$/.test(attempt))throw Error('Unique selection attempt required')
const output=resolve(__dirname,'../../../qa-selection29',attempt)
export default defineConfig({testDir:resolve(__dirname,'../..'),workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[
 {name:'customer-width-cases',testMatch:['**/tests/e2e-preview/customer-domain-scope.spec.ts']},
 ...[390,768,1440].map(width=>({name:`invoice-${width}`,testMatch:['**/tools/oier_billing_qa/prompt-interaction.spec.ts'],use:{viewport:{width,height:960}}})),
]})
