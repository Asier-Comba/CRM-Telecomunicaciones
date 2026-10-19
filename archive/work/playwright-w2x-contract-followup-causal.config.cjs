const previous=require('./playwright-w2x-line-parent-read-causal.config.cjs')
module.exports={...previous,testMatch:['contract-followup-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-contract-followup-causal-results')}
