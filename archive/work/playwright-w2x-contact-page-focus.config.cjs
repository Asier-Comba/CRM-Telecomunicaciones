const {defineConfig}=require('./crm-w2x-contact-page-focus/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-contact-page-focus/tests/e2e-preview',testMatch:'contact-page-focus.spec.ts',workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-contact-page-focus-results',use:{browserName:'chromium',screenshot:'only-on-failure'}})
