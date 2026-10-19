import {defineConfig} from '@playwright/test'
import {resolve} from 'node:path'
const attempt=process.env.OIER_QA_ATTEMPT
if(!attempt||!/^night-unit(03|04)-attempt\d{2}$/.test(attempt))throw Error('Set a NEW OIER_QA_ATTEMPT=night-unit03/04-attemptNN; retain previous attempts')
const output=resolve(__dirname,'../../../oier-billing-cloud-20261019',attempt)
export default defineConfig({
 testDir:__dirname,testMatch:attempt.startsWith('night-unit04-')?'proposal-context.spec.ts':'prompt-interaction.spec.ts',workers:1,fullyParallel:false,retries:0,
 timeout:45000,expect:{timeout:4000},outputDir:resolve(output,'artifacts'),
 reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],
 use:{browserName:'chromium',timezoneId:'Europe/Madrid',screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:[390,768,1440].map(width=>({name:`controlled-http-${width}`,use:{viewport:{width,height:960}}})),
})
