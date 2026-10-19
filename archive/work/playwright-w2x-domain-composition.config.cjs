const previous=require('./playwright-w2x-case-document.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview'),testMatch:[...previous.testMatch,'customer-domain-page-focus.spec.ts','customer-domain-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-domain-composition-results')}
