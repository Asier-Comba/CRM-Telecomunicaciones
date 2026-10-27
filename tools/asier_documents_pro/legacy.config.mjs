import {defineConfig} from '@playwright/test'
import {existsSync} from 'node:fs'
import {resolve} from 'node:path'
const output=process.env.DOCUMENTS_PRO_LEGACY_OUTPUT
if(!output||process.env.TEST_WORKER_INDEX===undefined&&existsSync(output))throw Error('NEW_DOCUMENTS_LEGACY_OUTPUT_REQUIRED')
export default defineConfig({testDir:'../../tests/e2e-preview',testMatch:['document-current-selection.spec.ts','document-preview-lifetime.spec.ts','document-maintenance-step.spec.ts','observed-document-route.spec.ts'],workers:1,retries:0,timeout:45000,expect:{timeout:5000},outputDir:resolve(output,'browser'),reporter:[['line'],['json',{outputFile:resolve(output,'results.json')}]],use:{browserName:'chromium',trace:'off',screenshot:'only-on-failure'}})
