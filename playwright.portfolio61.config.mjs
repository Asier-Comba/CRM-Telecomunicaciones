import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
const folder=process.env.ASIER61_OUTPUT
if(!folder)throw Error('NEW_ASIER61_OUTPUT_REQUIRED')
if(process.env.TEST_WORKER_INDEX===undefined&&existsSync(folder))throw Error('PRESERVE_EXISTING_ATTEMPT')
export default defineConfig({testDir:'./tests/e2e-preview',testMatch:['portfolio-reference-progress.spec.ts','commercial-resource-scope.spec.ts','portfolio-reference-close.spec.ts','reports-observer-passive.spec.ts'],workers:1,fullyParallel:false,retries:0,timeout:45000,expect:{timeout:5000},outputDir:resolve(folder,'browser'),reporter:[['line'],['json',{outputFile:resolve(folder,'results.json')}]],use:{browserName:'chromium',timezoneId:'Europe/Madrid',trace:'retain-on-failure',screenshot:'only-on-failure'}})
