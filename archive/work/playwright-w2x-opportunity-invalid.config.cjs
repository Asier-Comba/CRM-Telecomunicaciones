const previous=require('./playwright-w2x-customer-state-invalid.config.cjs')
module.exports={...previous,testMatch:['opportunity-invalid-receipt.spec.ts','opportunity-recovery-close.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-opportunity-invalid-results')}
