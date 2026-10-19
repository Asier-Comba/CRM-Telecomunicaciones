const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['document-contract-selection.spec.ts','document-current-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-contract-selection-results')}
