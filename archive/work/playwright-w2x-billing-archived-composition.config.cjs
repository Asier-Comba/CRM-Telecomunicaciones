const previous=require('./playwright-w2x-billing-preparation-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'billing-archived-customer.spec.ts','billing-physical-preparation-consumer.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-billing-archived-composition-results')}
