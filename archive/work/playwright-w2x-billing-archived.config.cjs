const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['billing-archived-customer.spec.ts','billing-create-read-lifetime.spec.ts','billing-uncertain-intent.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-billing-archived-results')}
