const {defineConfig}=require('./crm-w2x-contact-state/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-contact-state/tests/e2e-preview',testMatch:'contact-customer-state.spec.ts',workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-contact-state-results',use:{browserName:'chromium',screenshot:'only-on-failure'}})
