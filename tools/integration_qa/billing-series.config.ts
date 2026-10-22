import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_SERIES_ATTEMPT
if(!attempt||!/^series-(before|after)\d{2}$/.test(attempt))throw Error('Unique series attempt required')
const output=resolve(__dirname,'../../../qa-series36',attempt)
export default defineConfig({testDir:resolve(__dirname,'../../tests/e2e-preview'),testMatch:['billing-financial-refresh.spec.ts','billing-preparation-context.spec.ts','billing-initial-context.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'}})
