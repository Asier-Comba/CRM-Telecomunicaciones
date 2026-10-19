const previous=require('./playwright-w2x-document-lifetime-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'invoice-contract-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-invoice-document-composition-results')}
