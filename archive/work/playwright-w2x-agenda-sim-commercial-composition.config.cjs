const previous=require('./playwright-w2x-reopen-commercial-composition.config.cjs')
module.exports={...previous,testMatch:[...previous.testMatch,'agenda-reopen-recovery.spec.ts','sim-replacement-read-recovery.spec.ts'],outputDir:require('node:path').resolve(__dirname,'w2x-agenda-sim-commercial-composition-results')}
