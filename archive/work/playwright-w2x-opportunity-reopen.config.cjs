const previous=require('./playwright-w2x-opportunity-invalid.config.cjs')
module.exports={...previous,testMatch:['opportunity-reopen-recovery.spec.ts','opportunity-recovery-close.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-opportunity-reopen-results')}
