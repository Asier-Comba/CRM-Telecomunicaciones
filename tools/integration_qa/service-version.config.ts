import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.CRM_SERVICE_VERSION_ATTEMPT
if(!attempt||!/^service-version-(before|after)\d{2}$/.test(attempt))throw Error('Unique service version attempt required')
const output=resolve(__dirname,'../../../qa-service30',attempt)
export default defineConfig({testDir:resolve(__dirname,'../../tests/e2e-preview'),testMatch:['service-sold-version.spec.ts','portfolio-selection-race.spec.ts','portfolio-reference-close.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'}})
