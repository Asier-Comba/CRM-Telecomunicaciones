const previous=require('./playwright-w2x-document-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'document-contract-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-document-final-composition-results')}
