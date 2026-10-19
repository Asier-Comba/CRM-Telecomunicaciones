const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['customer-invalid-receipt.spec.ts','customer-uncertain-intent.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-invalid-results')}
