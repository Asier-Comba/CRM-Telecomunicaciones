const {defineConfig}=require('./crm-w2x-contacts/node_modules/@playwright/test')
module.exports=defineConfig({testDir:'./crm-w2x-contacts/tests/e2e-preview',testMatch:['contact-uncertain-intent.spec.ts','customer-contact-read-retry.spec.ts'],workers:1,retries:0,timeout:60000,reporter:'line',outputDir:'./w2x-contacts-results',use:{browserName:'chromium',screenshot:'only-on-failure'}})
