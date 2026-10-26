import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const source=process.argv[2],destination=process.argv[3]
if(!source||!destination)throw Error('SOURCE_AND_DESTINATION_REQUIRED')
mkdirSync(destination,{recursive:true})
const attempts=[]
for(const name of readdirSync(source).filter(n=>/^attempt\d{2}$/.test(n)).sort()){
  const raw=JSON.parse(readFileSync(resolve(source,name,'results.json')))
  const specs=suite=>[...(suite.specs??[]),...(suite.suites??[]).flatMap(specs)]
  const rows=(raw.suites??[]).flatMap(specs).map(s=>({scenario:s.title,
    results:s.tests.flatMap(t=>t.results.map(r=>({status:r.status,duration_ms:r.duration,retry:r.retry}))),
    label:s.title.startsWith('RED ')?'DELIBERATE_PENDING_READ_COUNTEREXAMPLE':name==='attempt03'?'OWN_SETUP_FAILURE_NOT_PRODUCT':'CONTROL',
  }))
  attempts.push({attempt:name,stats:raw.stats,scenarios:rows})
}
const files=readdirSync(import.meta.dirname).filter(n=>/\.(mjs|cjs|tsx)$/.test(n)).sort()
const fingerprints=Object.fromEntries(files.map(n=>[n,createHash('sha256').update(readFileSync(resolve(import.meta.dirname,n))).digest('hex')]))
const summary={kind:'CONTROLLED_COMPONENT_CHARACTERIZATION_NOT_AUTH_ACCEPTANCE',product_sha:'3e98b55aec0ab38c3a17974927ec43afd3678b87',
  current_tool_files_sha256:fingerprints,attempts,
  notes:['Files changed after attempt02: wait for validated old body plus render turns; output preservation guard;3 loaded-context controls; optional report Proxy target. See exact-commit verification in handoff.','attempt03:1own setupFAIL/6not-run preserved, never counted as product failure.'],
}
writeFileSync(resolve(destination,'CHARACTERIZATION.json'),JSON.stringify(summary,null,2)+'\n')
const folder=resolve(source,'attempt02/browser')
const pending=readdirSync(folder).filter(n=>n.startsWith('reports-initial-RED-'))
for(const name of pending){
  const width=name.match(/at-(390|768|1440)$/)?.[1]
  if(!width)throw Error('WIDTH_REQUIRED')
  const safe=JSON.parse(readFileSync(resolve(folder,name,'initial-read.safe.json')))
  if(safe.scope!=='PASSIVE_CONTROLLED_REPORT_INITIAL_READ_NOT_AUTH_OR_CAUSE_PROOF'||safe.business_commands!==0||safe.truncated)throw Error('SAFE_SCOPE_REQUIRED')
  writeFileSync(resolve(destination,`pending-read-${width}.safe.json`),JSON.stringify(safe,null,2)+'\n')
}
console.log(JSON.stringify(attempts.map(({attempt,stats})=>({attempt,...stats}))))
