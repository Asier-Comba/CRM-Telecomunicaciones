import {defineConfig} from '@playwright/test'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
const output=process.env.ASIER63_OPPORTUNITY_OUTPUT
if(!output||process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('NEW_OPPORTUNITY_OUTPUT_REQUIRED')
export default defineConfig({testDir:'../../tests/unit63',testMatch:'opportunity-invoice.spec.ts',workers:1,retries:0,timeout:45000,expect:{timeout:5000},outputDir:resolve(output,'browser'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'}})
