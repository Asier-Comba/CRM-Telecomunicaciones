const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['portfolio-invalid-receipt-identity.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-portfolio-invalid-causal-results')}
