const previous=require('./playwright-w2x-billing-archived-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'agenda-invalid-receipt.spec.ts','billing-invalid-receipt.spec.ts','billing-receipt-read-boundary.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-invalid-receipt-commercial-composition-results')}
