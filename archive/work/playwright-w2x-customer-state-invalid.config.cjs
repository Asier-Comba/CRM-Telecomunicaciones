const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['customer-state-invalid-receipt.spec.ts','customer-state-uncertain.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-state-invalid-results')}
