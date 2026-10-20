import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_CATALOG_ATTEMPT
if(!attempt||!/^catalog-version-(before|after)\d{2}$/.test(attempt))throw Error('Unique catalog version attempt required')
const output=resolve(__dirname,'../../../qa-unit22',attempt)
export default defineConfig({testDir:resolve(__dirname,'../oier_commercial_qa'),testMatch:['catalog-version.spec.ts','catalog-plan-acceptance.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
