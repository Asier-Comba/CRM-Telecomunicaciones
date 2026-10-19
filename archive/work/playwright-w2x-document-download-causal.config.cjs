const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['document-download-lifetime.spec.ts','document-integrity-lifetime.spec.ts','document-state-uncertain.spec.ts','document-current-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-download-causal-results')}
