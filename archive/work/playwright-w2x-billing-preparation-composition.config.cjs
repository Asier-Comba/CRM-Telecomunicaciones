const previous=require('./playwright-w2x-domain-composition.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-commercial-composition/tests/e2e-preview'),testMatch:[...previous.testMatch,'billing-create-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-billing-preparation-composition-results')}
