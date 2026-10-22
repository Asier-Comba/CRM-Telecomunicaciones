import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_PORTFOLIO_FEEDBACK_REGRESSION_ATTEMPT
if(!attempt||!/^portfolio-feedback-regression\d{2}$/.test(attempt))throw Error('Unique OIER_PORTFOLIO_FEEDBACK_REGRESSION_ATTEMPT required')
const output=resolve(__dirname,'../../../oier-commercial-20261020',attempt)
export default defineConfig({testDir:resolve(__dirname,'../../tests/e2e-preview'),testMatch:['portfolio-selection-race.spec.ts','portfolio-reference-close.spec.ts'],workers:1,retries:0,timeout:180000,expect:{timeout:5000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'}})
