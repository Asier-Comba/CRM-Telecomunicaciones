const previous=require('./playwright-w2x-contract-followup-causal.config.cjs')
module.exports={...previous,testMatch:['contract-followup-read-lifetime.spec.ts','line-parent-read-lifetime.spec.ts','case-contract-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-contract-followup-final-results')}
