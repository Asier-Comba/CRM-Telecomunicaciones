const previous=require('./playwright-w2x-opportunity-reopen.config.cjs')
module.exports={...previous,testMatch:['agenda-reopen-recovery.spec.ts','agenda-invalid-receipt.spec.ts','agenda-uncertain-intent.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-agenda-reopen-results')}
