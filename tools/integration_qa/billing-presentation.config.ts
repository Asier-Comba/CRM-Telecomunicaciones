import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_BILLING_PRESENTATION_ATTEMPT
if(!attempt||!/^billing-presentation-(before|after)\d{2}$/.test(attempt))throw Error('Unique billing presentation attempt required')
const output=resolve(__dirname,'../../../qa-unit20',attempt)
export default defineConfig({testDir:resolve(__dirname,'../oier_billing_qa'),testMatch:['prompt-interaction.spec.ts','proposal-intent.spec.ts','proposal-dialog-context.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
