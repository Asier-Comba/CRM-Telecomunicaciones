const previous=require('./playwright-w2x-contract-followup-final.config.cjs')
module.exports={...previous,testMatch:['contract-followup-read-lifetime.spec.ts','line-parent-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-contract-followup-status-final-results')}
