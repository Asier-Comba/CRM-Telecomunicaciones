import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const path='docs/master/TELECOM_DOMAIN_ACCEPTANCE_MATRIX.json'
const matrix=JSON.parse(readFileSync(path,'utf8')),keys=['REQUIRED','IMPLEMENTED','PROVEN','W2_CONSUMED','BLOCKER']
assert.ok(Array.isArray(matrix.rows)&&matrix.rows.length>0)
const seen=new Set()
for(const row of matrix.rows){const key=row.section+'|'+row.requirement;assert.ok(!seen.has(key),'duplicate matrix row');seen.add(key);for(const name of keys.slice(0,4))assert.equal(typeof row[name],'boolean');assert.ok(!row.PROVEN||row.IMPLEMENTED,'proof requires implementation');assert.ok(!row.W2_CONSUMED||row.PROVEN,'consumption requires proof')}
const counts=Object.fromEntries(keys.map(key=>[key,matrix.rows.filter(row=>Boolean(row[key])).length]))
if(process.argv.includes('--write')){matrix.counts=counts;writeFileSync(path,JSON.stringify(matrix,null,2)+'\n');const esc=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ');const rows=matrix.rows.map(row=>'| '+[row.section,row.requirement,...keys.map(key=>key==='BLOCKER'?row[key]:row[key]?'YES':'NO')].map(esc).join(' | ')+' |');writeFileSync('docs/master/TELECOM_DOMAIN_ACCEPTANCE_MATRIX.md','# Telecom domain acceptance matrix\n\nGenerated from JSON with scripts/domain/validate-telecom-matrix.mjs --write.\n\nSource: `'+matrix.source_sha+'`. Accepted functional source: `'+matrix.accepted_source_sha+'`. W2 consumption is independent of backend acceptance. Overall CI remains blocked by dependency audit.\n\n| Section | Requirement | REQUIRED | IMPLEMENTED | PROVEN | W2_CONSUMED | BLOCKER |\n| --- | --- | --- | --- | --- | --- | --- |\n'+rows.join('\n')+'\n\nCounts: `'+JSON.stringify(counts)+'`.\n')}
else assert.deepEqual(matrix.counts,counts,'matrix totals must derive from actual rows')
console.log(JSON.stringify({matrix:'PASS',counts}))
