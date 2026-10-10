import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

// Historical implementation flags are evidence to inspect, never acceptance.
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)))
const stages=['IMPLEMENTED','PROVEN_BACKEND','CONSUMED_UI','BROWSER_ACCEPTED','VISUAL_ACCEPTED','SECURITY_ACCEPTED']
const states=['NOT_RECONCILED','PARTIAL','PASS','NOT_APPLICABLE']
const sha=/^[0-9a-f]{40}$/
const canonicalText=value=>value.toString('utf8').replace(/\r\n/g,'\n')
const hash=value=>createHash('sha256').update(canonicalText(value)).digest('hex')
async function input(path){const bytes=await readFile(resolve(root,path));return {path,sha256:hash(bytes),value:JSON.parse(bytes.toString('utf8'))}}

export function reconcileRows(parity,telecom,reviews){
 assert.equal(parity.rows.length,244,'canonical parity rows changed: explicitly review the inventory')
 assert.equal(telecom.rows.length,98,'canonical telecom rows changed: explicitly review the inventory')
 assert.match(reviews.accepted_source,sha);assert.match(reviews.candidate_source,sha)
 const rows=[...parity.rows.map(row=>({id:row.id,capability:row.capability,family:'parity',historical:row})),
  ...telecom.rows.map((row,i)=>({id:`TEL-${String(i+1).padStart(3,'0')}`,capability:row.requirement,family:'telecom',historical:row}))]
 assert.equal(new Set(rows.map(r=>r.id)).size,342,'duplicate canonical identity')
 const known=new Set(rows.map(r=>r.id))
 for(const id of Object.keys(reviews.row_reviews))assert.ok(known.has(id),'review refers to an unknown capability')
 return rows.map(({id,capability,family,historical})=>{
  const review=reviews.row_reviews[id]
  const statuses=Object.fromEntries(stages.map(stage=>[stage,'NOT_RECONCILED']))
  let external='NOT_RECONCILED'
  if(review){
   assert.match(review.source_sha,sha);assert.ok(Array.isArray(review.evidence)&&review.evidence.length>0)
   for(const evidence of review.evidence){
    assert.match(evidence.source_sha,sha);assert.ok(evidence.scope&&evidence.paths.length>0)
    assert.ok(['LOCAL_EMBEDDED','NATIVE','AUTH_BROWSER','VISUAL','INDEPENDENT_W4','SOURCE'].includes(evidence.kind))
   }
   for(const [stage,state]of Object.entries(review.stages)){
    assert.ok(stages.includes(stage));assert.ok(states.includes(state));statuses[stage]=state
    // A PASS requires explicit per-row evidence, including the scope's limits.
    // Aggregate suite totals are intentionally not eligible here.
    if(state==='PASS')assert.ok(review.evidence.some(e=>e.stage===stage&&e.positive&&e.negative&&e.execution&&e.scope==='FULL_ROW'),`unproven ${id}/${stage}`)
    if(stage==='SECURITY_ACCEPTED'&&state==='PASS')assert.ok(review.evidence.some(e=>e.stage===stage&&e.kind==='INDEPENDENT_W4'&&e.execution),`independent W4 missing: ${id}`)
    if(state==='NOT_APPLICABLE')assert.ok(review.not_applicable_reason?.[stage],`scope decision missing: ${id}/${stage}`)
   }
   external=review.external_blocked??external
   assert.ok(['NOT_RECONCILED','BLOCKED','CLEAR'].includes(external))
  }
  const ready=Boolean(review&&review.required!==false&&external==='CLEAR'&&reviews.global_release_blockers.length===0
   &&stages.every(stage=>['PASS','NOT_APPLICABLE'].includes(statuses[stage])))
  return {id,capability,family,REQUIRED:review?.required??true,...statuses,EXTERNAL_BLOCKED:external,RELEASE_READY:ready,
   owner:review?.owner??(family==='telecom'?'W1/W2; W4 acceptance':capability.startsWith('Asistente:')?'W2/W3; W4 acceptance':'W2; W1 contracts; W4 acceptance'),
   priority:review?.priority??'P1',source_sha:review?.source_sha??null,
   evidence:review?.evidence??[],permissions:review?.permissions??'NOT_RECONCILED',mobile:review?.mobile??'NOT_RECONCILED',
   pending:review?.pending??'Map current implementation and row-specific positive, negative, permission, responsive and visual evidence before promotion.',
   historical_snapshot:historical}
 })
}

export async function buildQueue(){
 const inputs=await Promise.all(['docs/master/PRODUCT_PARITY_STATUS.json','docs/master/TELECOM_DOMAIN_ACCEPTANCE_MATRIX.json','docs/master/PRODUCT_RELEASE_REVIEWS.json'].map(input))
 const [parity,telecom,reviews]=inputs.map(i=>i.value)
 const rows=reconcileRows(parity,telecom,reviews)
 for(const row of rows)for(const evidence of row.evidence)for(const path of evidence.paths){
  assert.ok(!path.includes('..')&&!path.startsWith('/')&&!path.includes(':'),'evidence must be repository-relative')
  await readFile(resolve(root,path))
 }
 const documents=await Promise.all(['docs/master/W2_24H_PRODUCT_GAP_MAP.md','docs/master/PRODUCT_FINAL_GAP_REVIEW.md','docs/master/W2_W3_ACCEPTANCE_LEDGER_20261009.md','docs/master/ai/W3_DURABLE_DB_CONTRACT_V1.md'].map(async path=>({path,sha256:hash(await readFile(resolve(root,path)))})))
 return {schema_version:1,reviewed_at:reviews.reviewed_at,acceptance_policy:'No inherited or aggregate PASS promotions. NOT_RECONCILED means unverified here, not absent in the product.',
  accepted_source:reviews.accepted_source,candidate_source:reviews.candidate_source,candidate_pr:reviews.candidate_pr,
  inherited_baseline:reviews.inherited_baseline,candidate_verification:reviews.candidate_verification,global_release_blockers:reviews.global_release_blockers,
  hash_encoding:'sha256_utf8_lf',input_snapshots:inputs.map(({path,sha256})=>({path,sha256})),reference_documents:documents,
  review_progress:{total:rows.length,parity:244,telecom:98,reviewed_partial:Object.keys(reviews.row_reviews).length,unreconciled:rows.filter(r=>r.evidence.length===0).length,release_ready:rows.filter(r=>r.RELEASE_READY).length},
  next_3:reviews.next_3,rows}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2]??'--check';assert.ok(['--check','--write'].includes(mode))
 const queue=await buildQueue(),path=resolve(root,'docs/master/PRODUCT_RELEASE_QUEUE.json')
 const content=JSON.stringify(queue,null,2)+'\n'
 if(mode==='--write')await writeFile(path,content)
 else assert.equal(canonicalText(await readFile(path,'utf8')),content,'release queue is stale: review deltas, then regenerate')
 console.log(JSON.stringify({mode,...queue.review_progress,release:'NOT_ACCEPTED'}))
}
