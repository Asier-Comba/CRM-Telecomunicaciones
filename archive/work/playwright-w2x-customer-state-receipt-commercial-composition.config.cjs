const previous=require('./playwright-w2x-contact-receipt-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'customer-state-invalid-receipt.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-state-receipt-commercial-composition-results')}
