from pathlib import Path
import json
w=Path('work');p='w2x-commercial-number-full'
(w/('playwright-'+p+'.config.cjs')).write_text("const p=require('./playwright-w2x-commercial-contract-lifetime-full.config.cjs');module.exports={...p,testMatch:[...p.testMatch,'portability-recovery-close.spec.ts','line-number-recovery-close.spec.ts'],outputDir:require('node:path').resolve(__dirname,'"+p+"-results')}\n",encoding='utf-8')
(w/('playwright-'+p+'-candidate-list.config.cjs')).write_text("const p=require('./playwright-"+p+".config.cjs');module.exports={...p,testDir:require('node:path').resolve(__dirname,'crm-w2x-document-upload-uncertain/tests/e2e-preview')}\n",encoding='utf-8')
(w/(p+'-prepared.json')).write_text(json.dumps({'state':'PREPARED_ONLY_NOT_DISPATCHED','unit':88,'requires':'Owncorrected189/build/lint/scan/visual/PUBLISHED andprior2007terminal/PUBLISHED/PASS;1968/2007pinnednotretargeted','composition':'2007+24Portability87+12LineNumber88','tests_expected':2043,'files_expected':118},indent=2)+'\n',encoding='utf-8')
