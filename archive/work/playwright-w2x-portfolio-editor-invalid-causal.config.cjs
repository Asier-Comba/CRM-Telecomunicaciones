const previous=require('./playwright-w2x-line-parent-read-causal.config.cjs')
module.exports={...previous,testMatch:['portfolio-editor-invalid-identity.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-portfolio-editor-invalid-causal-results')}
