const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['customer-post-command-lifetime.spec.ts','customer-reload-order.spec.ts','customer-uncertain-intent.spec.ts','customer-resource-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-customer-post-command-causal-results')}
