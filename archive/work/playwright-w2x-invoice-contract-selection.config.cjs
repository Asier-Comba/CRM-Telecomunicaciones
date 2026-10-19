const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['invoice-contract-selection.spec.ts','billing-archived-customer.spec.ts','billing-create-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-invoice-contract-selection-results')}
