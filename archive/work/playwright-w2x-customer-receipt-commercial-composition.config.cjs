const previous=require('./playwright-w2x-invalid-receipt-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'customer-invalid-receipt.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-receipt-commercial-composition-results')}
