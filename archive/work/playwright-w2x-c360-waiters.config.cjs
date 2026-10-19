const {defineConfig}=require('./crm-w2x-c360-failure-waiters/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-c360-failure-waiters/tests/e2e-preview',testMatch:'c360-failure-waiters.spec.ts',workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-c360-waiters-results',use:{browserName:'chromium'}})
