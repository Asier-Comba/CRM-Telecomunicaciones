const previous=require('./playwright-w2x-agenda-sim-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'document-integrity-receipt.spec.ts','document-integrity-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-commercial-composition-results')}
