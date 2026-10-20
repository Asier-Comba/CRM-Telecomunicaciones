import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_PORTABILITY_READBACK_ATTEMPT
if(!attempt||!/^portability-readback-attempt\d{2}$/.test(attempt))throw Error('Unique OIER_PORTABILITY_READBACK_ATTEMPT required')
const output=resolve(__dirname,'../../../oier-commercial-20261020',attempt)
export default defineConfig({testDir:__dirname,testMatch:'portability-readback.spec.ts',workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
