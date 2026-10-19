from pathlib import Path
import json
w=Path('work');p='w2x-commercial-drawer-full'
(w/('playwright-'+p+'.config.cjs')).write_text("const p=require('./playwright-w2x-commercial-number-full.config.cjs');module.exports={...p,testMatch:[...p.testMatch,'sim-identifier-recovery-close.spec.ts','portfolio-result-label-wrap.spec.ts','portfolio-selected-title-wrap.spec.ts'],outputDir:require('node:path').resolve(__dirname,'"+p+"-results')}\n",encoding='utf-8')
(w/('playwright-'+p+'-candidate-list.config.cjs')).write_text("const p=require('./playwright-"+p+".config.cjs');module.exports={...p,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview')}\n",encoding='utf-8')
(w/(p+'-prepared.json')).write_text(json.dumps({'state':'PREPARED_ONLY_NOT_DISPATCHED','unit':92,'requires':'Own282/build/lint/scan/visual/PUBLISHED andprior2043terminal/PUBLISHED/PASS;2007/2043pinsunchanged','composition':'2043+48SIMidentifier90+9PortfolioCard91+9DrawerTitle92','tests_expected':2109,'files_expected':121,'scope':'Coalescedthreechanges including sharedDrawerCSS;no per-unit fourthfull or inheritedPASS'},indent=2)+'\n',encoding='utf-8')
