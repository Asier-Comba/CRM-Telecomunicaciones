const previous=require('./playwright-w2x-commercial-lifetime-full.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-commercial-composition/tests/e2e-preview'),testMatch:[...previous.testMatch,'private-fiscal-pdf-lifetime.spec.ts','authorized-pdf-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-commercial-pdf-full-results')}
