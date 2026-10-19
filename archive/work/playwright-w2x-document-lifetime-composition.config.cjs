const previous=require('./playwright-w2x-customer-document-final-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'document-integrity-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-document-lifetime-composition-results')}
