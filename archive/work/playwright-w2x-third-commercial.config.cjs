const previous=require('./playwright-w2x-second-commercial.config.cjs')
module.exports={...previous,testDir:require('node:path').resolve(__dirname,'crm-w2x-portfolio-receipt-close/tests/e2e-preview'),testMatch:[...previous.testMatch,'portfolio-create-receipt-close.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-third-commercial-results')}
