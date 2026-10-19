const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-commercial-composition/tests/e2e-preview'),testMatch:['line-parent-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-line-parent-read-causal-results')}
