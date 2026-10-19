const previous=require('./playwright-w2x-portfolio-invalid-causal.config.cjs')
module.exports={...previous,testMatch:['portfolio-invalid-receipt-recovery.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-portfolio-invalid-new-flows-results')}
