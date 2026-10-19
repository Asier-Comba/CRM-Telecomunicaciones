const {defineConfig}=require('./crm-w2x-customer-uncertain/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-customer-uncertain/tests/e2e-preview',testMatch:'customer-uncertain-intent.spec.ts',workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-customer-uncertain-results',use:{browserName:'chromium',screenshot:'only-on-failure'}})
