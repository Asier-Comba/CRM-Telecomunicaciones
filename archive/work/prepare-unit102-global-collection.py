from pathlib import Path
w=Path('work');p='w2x-commercial-collection-full'
(w/('playwright-'+p+'.config.cjs')).write_text("const p=require('./playwright-w2x-commercial-mobile-product-full.config.cjs');module.exports={...p,testMatch:[...p.testMatch,'customer-list-page-focus.spec.ts','customer-list-refresh-focus.spec.ts','customer-domain-table-title-wrap.spec.ts'],outputDir:require('node:path').resolve(__dirname,'"+p+"-results')}\n",encoding='utf-8')
(w/('playwright-'+p+'-candidate.config.cjs')).write_text("const p=require('./playwright-"+p+".config.cjs');module.exports={...p,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview')}\n",encoding='utf-8')
