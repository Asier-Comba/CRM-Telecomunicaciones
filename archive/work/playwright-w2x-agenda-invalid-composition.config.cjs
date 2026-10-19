const previous=require('./playwright-w2x-billing-archived-composition.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview'),testMatch:[...previous.testMatch,'agenda-invalid-receipt.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-agenda-invalid-composition-results')}
