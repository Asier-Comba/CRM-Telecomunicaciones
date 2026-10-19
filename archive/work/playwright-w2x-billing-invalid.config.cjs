const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['billing-invalid-receipt.spec.ts','billing-uncertain-intent.spec.ts','billing-receipt-read-boundary.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-billing-invalid-results')}
