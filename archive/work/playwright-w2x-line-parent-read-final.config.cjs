const previous=require('./playwright-w2x-line-parent-read-causal.config.cjs')
module.exports={...previous,testMatch:['line-parent-read-lifetime.spec.ts','case-contract-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-line-parent-read-final-results')}
