const previous=require('./playwright-w2x-fourth-commercial.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-case-notes/tests/e2e-preview'),testMatch:[...previous.testMatch,'case-note-pagination.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-case-document-results')}
