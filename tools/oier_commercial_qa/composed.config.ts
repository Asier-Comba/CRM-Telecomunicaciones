import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_COMPOSED_ATTEMPT
if(!attempt||!/^composed-attempt\d{2}$/.test(attempt))throw Error('Unique OIER_COMPOSED_ATTEMPT required')
const output=resolve(__dirname,'../../../oier-commercial-20261020',attempt)
export default defineConfig({testDir:__dirname,testMatch:['portfolio-readback.spec.ts','case-readback.spec.ts','calendar-intent.spec.ts','document-intent.spec.ts','portfolio-create-intent.spec.ts','contract-shortcut.spec.ts','document-context.spec.ts','inbox-intent.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
