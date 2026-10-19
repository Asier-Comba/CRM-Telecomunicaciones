const previous=require('./playwright-w2x-invoice-document-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'dashboard-current-day.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-dashboard-commercial-composition-results')}
