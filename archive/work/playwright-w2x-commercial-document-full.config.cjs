const previous=require('./playwright-w2x-commercial-pdf-full.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview'),testMatch:[...previous.testMatch,'document-download-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-commercial-document-full-results')}
