const previous=require('./playwright-w2x-customer-receipt-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'contact-invalid-receipt.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-contact-receipt-commercial-composition-results')}
