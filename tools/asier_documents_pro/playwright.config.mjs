import {defineConfig} from '@playwright/test'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
const output=process.env.DOCUMENTS_PRO_OUTPUT
if(!output||process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('NEW_DOCUMENTS_OUTPUT_REQUIRED')
export default defineConfig({testDir:'../../tests/documents-pro',testMatch:'*.spec.ts',workers:1,retries:0,timeout:45000,expect:{timeout:5000},outputDir:resolve(output,'browser'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',trace:'off',screenshot:'only-on-failure'}})
