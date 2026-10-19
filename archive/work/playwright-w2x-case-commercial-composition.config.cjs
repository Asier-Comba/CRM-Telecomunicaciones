const previous=require('./playwright-w2x-dashboard-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'case-detail-read-lifetime.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-case-commercial-composition-results')}
