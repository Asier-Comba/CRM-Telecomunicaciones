const previous=require('./playwright-w2x-document-integrity.config.cjs')
module.exports={...previous,testMatch:['case-command-refresh-lifetime.spec.ts','case-detail-read-lifetime.spec.ts','case-note-pagination.spec.ts','customer-resource-scope.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-case-command-refresh-lifetime-results')}
