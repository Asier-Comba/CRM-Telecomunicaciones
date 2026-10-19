const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['contact-invalid-receipt.spec.ts','contact-uncertain-intent.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-contact-invalid-results')}
