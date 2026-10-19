const previous=require('./playwright-w2x-opportunity-invalid.config.cjs')
module.exports={...previous,testMatch:['pipeline-stage-receipt.spec.ts','pipeline-current-query.spec.ts','pipeline-catalog-recovery.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-pipeline-stage-results')}
