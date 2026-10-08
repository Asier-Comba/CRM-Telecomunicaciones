import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {readJson,root} from './lib.mjs'

const path='docs/master/platform/ENTERPRISE_BOOTSTRAP_MATRIX.json',matrix=readJson(path)
const flags=['IMPLEMENTED','LOCALLY_PROVEN','EXTERNAL_CONFIG_REQUIRED','STAGING_PROVEN','PROD_PROVEN']
if(!Array.isArray(matrix.rows)||matrix.rows.length!==22||new Set(matrix.rows.map(r=>r.subsystem)).size!==22)throw new Error('READINESS_SUBSYSTEM_INVENTORY_INVALID')
for(const row of matrix.rows){
 if(flags.some(k=>typeof row[k]!=='boolean')||!row.OWNER||!Object.hasOwn(row,'EVIDENCE_SHA')||!Object.hasOwn(row,'EVIDENCE_RUN')||!row.local_proof_scope)throw new Error('READINESS_EVIDENCE_FIELDS_REQUIRED')
 if(row.LOCALLY_PROVEN&&(!/^[a-f0-9]{40}$/.test(row.EVIDENCE_SHA??'')||!/^https:\/\/github.com\/Asier-Comba\/CRM-Telecomunicaciones\/actions\/runs\/\d+$/.test(row.EVIDENCE_RUN??'')))throw new Error('READINESS_LOCAL_EVIDENCE_REQUIRED')
 if(row.STAGING_PROVEN||row.PROD_PROVEN)throw new Error('CURRENT_HOSTED_READINESS_NOT_ACCEPTED')
}
const counts=Object.fromEntries(flags.map(k=>[k,matrix.rows.filter(r=>r[k]).length]))
if(process.argv.includes('--write'))writeFileSync(join(root,path),JSON.stringify({...matrix,counts},null,2)+'\n')
else if(JSON.stringify(matrix.counts)!==JSON.stringify(counts))throw new Error('READINESS_COUNTS_DRIFT')
console.log(JSON.stringify({status:'PASS',counts,scope:'DECLARED_EVIDENCE_SCHEMA_AND_COUNTS_ONLY',evidence_authenticated:false,staging:false,production:false}))
