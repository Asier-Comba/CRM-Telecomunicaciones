const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['agenda-invalid-receipt.spec.ts','agenda-uncertain-intent.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-agenda-invalid-results')}
