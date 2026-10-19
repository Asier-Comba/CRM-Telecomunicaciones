const previous=require('./playwright-w2x-commercial-lifetime-full.config.cjs')
module.exports={...previous,testMatch:['c360-failure-waiters.spec.ts','document-current-selection.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-commercial-lifetime-failed13-results')}
