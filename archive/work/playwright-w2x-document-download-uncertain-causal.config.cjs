const previous=require('./playwright-w2x-document-download-final.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-commercial-composition/tests/e2e-preview'),testMatch:[...previous.testMatch,'document-download-uncertain.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-download-uncertain-causal-results')}
