import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_IDENTITY_ATTEMPT
if(!attempt||!/^identity-attempt\d{2}$/.test(attempt))throw Error('A new OIER_IDENTITY_ATTEMPT is required')
const output=resolve(__dirname,'../../../oier-billing-fixes-20261020',attempt)
export default defineConfig({testDir:__dirname,testMatch:'customer-identity.spec.ts',workers:1,fullyParallel:false,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
