const previous=require('./playwright-w2x-document-integrity-close.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'document-integrity-scope.spec.ts','document-integrity-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-integrity-lifetime-results')}
