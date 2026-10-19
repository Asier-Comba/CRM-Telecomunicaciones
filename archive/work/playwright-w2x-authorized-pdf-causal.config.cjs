const previous=require('./playwright-w2x-private-fiscal-pdf-final.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'authorized-pdf-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-authorized-pdf-causal-results')}
