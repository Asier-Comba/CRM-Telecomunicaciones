const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['dashboard-current-day.spec.ts','customer-resource-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-dashboard-current-day-results')}
