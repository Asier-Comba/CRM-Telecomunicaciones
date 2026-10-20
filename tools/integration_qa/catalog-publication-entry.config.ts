import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_CATALOG_ENTRY_ATTEMPT
if(!attempt||!/^catalog-entry-(before|after)\d{2}$/.test(attempt))throw Error('Unique catalog entry attempt required')
const output=resolve(__dirname,'../../../qa-unit25',attempt)
export default defineConfig({testDir:resolve(__dirname,'../../tests/e2e-preview'),testMatch:['catalog-publication-entry.spec.ts','catalog-resource-scope.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[{name:'helper-1440',use:{viewport:{width:1440,height:960}}}]})
