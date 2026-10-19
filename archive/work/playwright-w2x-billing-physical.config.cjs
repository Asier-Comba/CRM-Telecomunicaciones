const previous=require('./playwright-w2x-billing-create.config.cjs')
module.exports={...previous,testMatch:['billing-physical-preparation-consumer.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-billing-physical-results')}
