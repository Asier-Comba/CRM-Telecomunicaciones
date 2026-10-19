const previous=require('./playwright-w2x-opportunity-receipt-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'opportunity-reopen-recovery.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-reopen-commercial-composition-results')}
