const {defineConfig}=require('./crm-w2x-customer-state-uncertain/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-customer-state-uncertain/tests/e2e-preview',testMatch:'customer-state-uncertain.spec.ts',workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-customer-state-uncertain-results',use:{browserName:'chromium',screenshot:'only-on-failure'}})
