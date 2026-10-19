import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_COMMERCIAL_REGRESSION_ATTEMPT
if(!attempt||!/^regression-attempt\d{2}$/.test(attempt))throw Error('Unique OIER_COMMERCIAL_REGRESSION_ATTEMPT required')
const output=resolve(__dirname,'../../../oier-commercial-20261020',attempt)
export default defineConfig({testDir:resolve(__dirname,'../../tests/e2e-preview'),testMatch:['portfolio-selection-race.spec.ts','portfolio-reference-close.spec.ts','case-note-pagination.spec.ts','calendar-selection-scope.spec.ts','calendar-agenda-focus.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[{name:'controlled-http-existing-commercial'}]})
