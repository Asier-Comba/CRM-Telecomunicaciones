import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_FINAL_ATTEMPT
if(!attempt||!/^final-attempt\d{2}$/.test(attempt))throw Error('A new OIER_FINAL_ATTEMPT is required')
const output=resolve(__dirname,'../../../oier-billing-fixes-20261020',attempt)
export default defineConfig({testDir:__dirname,testMatch:['prompt-interaction.spec.ts','proposal-context.spec.ts','proposal-intent.spec.ts','speech-fallback.spec.ts','customer-prompt-context.spec.ts','proposal-dialog-context.spec.ts','customer-identity.spec.ts'],workers:1,fullyParallel:false,retries:0,timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}}))})
