const previous=require('./playwright-w2x-customer-state-receipt-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'opportunity-invalid-receipt.spec.ts','pipeline-stage-receipt.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-opportunity-receipt-commercial-composition-results')}
