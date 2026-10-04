import { randomUUID } from 'node:crypto'
// Native independent-process evidence, only in the pinned disposable CI container.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
const container = process.env.TELECOM_NATIVE_TEST_CONTAINER ?? ''
assert.match(container, /^[0-9a-f]{12,64}$/)
const image = spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.match(image.stdout.trim(),/^postgres:16/)
const database='telecom_product_race_test'
function docker(args,input) {
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i','-u','postgres',container,...args],{stdio:['pipe','pipe','pipe']})
  let out='',err='';let timer=setTimeout(()=>child.kill('SIGKILL'),45000)
  child.stdout.on('data',b=>{out+=b;if(out.length>32768)child.kill('SIGKILL')})
  child.stderr.on('data',b=>{err+=b;if(err.length>32768)child.kill('SIGKILL')})
  child.on('error',reject);child.on('close',code=>{clearTimeout(timer);timer=null;resolve({code,out,err})})
  child.stdin.end(input)
 })
}
const args=['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
async function sql(input) {const r=await docker(args,input);assert.equal(r.code,0,'native product SQL failed');return r.out.trim()}
const workspace='b2000000-0000-4000-8000-000000000001'
const actor='a1000000-0000-4000-8000-000000000001'
const key='71000000-0000-4000-8000-000000000001'
const command={command_id:key,account_kind:'legal_entity',legal_name:'Native Race Synthetic'}
function create(input=command){return `begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.product_v1_customer_create('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`}
try {
 assert.equal((await docker(['createdb','-U','postgres',database])).code,0)
 await sql(readFileSync('scripts/security/native-postgres/bootstrap.sql','utf8').replace(/create role (anon|authenticated|service_role)[^;]*;/g,''))
 await sql(readFileSync('scripts/security/ephemeral-postgres/storage-stub.sql','utf8'))
 for(const migration of readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort()) await sql(readFileSync('supabase/migrations/'+migration,'utf8'))
 await sql("set app.environment='test';"+readFileSync('supabase/seeds/synthetic_portfolio.sql','utf8'))
 const races=await Promise.all(Array.from({length:20},()=>docker(args,create())))
 assert.ok(races.every(r=>r.code===0),'same-key native race failed')
 const receipts=races.map(r=>JSON.parse(r.out.trim()))
 for(const receipt of receipts)assert.deepEqual(receipt,receipts[0])
 assert.equal(await sql(`select count(*) from public.customers where legal_name='Native Race Synthetic'`),'1')
 assert.equal(await sql(`select count(*) from public.product_audit_events where command_id='${key}'`),'1')
 const conflict=await docker([...args.slice(0,-2),'-d',database,'--set=VERBOSITY=sqlstate'],create({...command,legal_name:'Changed Synthetic'}))
 assert.notEqual(conflict.code,0);assert.match(conflict.err,/40001/)
 const id=receipts[0].id
 const updates=await Promise.all(Array.from({length:20},(_,i)=>docker([...args,'--set=VERBOSITY=sqlstate'],
  `begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.product_v1_customer_update('${workspace}','${JSON.stringify({command_id:`72000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,id,expected_version:1,trade_name:'Synthetic CAS Race'})}'::jsonb);commit;`)))
 assert.equal(updates.filter(r=>r.code===0).length,1)
 assert.equal(updates.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 assert.equal(await sql(`select version from public.customers where id='${id}'`),'2')
 assert.equal(await sql(`select count(*) from public.product_audit_events where entity_id='${id}'`),'2')
 // A new psql process can recover the original receipt after concurrent edits.
 assert.deepEqual(JSON.parse(await sql(create())),receipts[0])
 await sql(`insert into public.opportunity_stages(id,workspace_id,code,display_name,position) values('74000000-0000-4000-8000-000000000001','${workspace}','native-open','Synthetic Open',0)`)
 const familyReplays=[]
 for(const [i,family] of ['task','meeting','opportunity'].entries()){
  const payload={command_id:`75000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,title:`Native ${family} race`,...(family==='meeting'?{starts_at:'2026-10-25T02:30:00+02:00',timezone:'Europe/Madrid'}:{}),...(family==='opportunity'?{customer_id:id,stage_id:'74000000-0000-4000-8000-000000000001'}:{})}
  const invoke=(action,body)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.product_v1_${family}_${action}('${workspace}','${JSON.stringify(body)}'::jsonb);commit;`
  const replaySql=invoke('create',payload);familyReplays.push(replaySql)
  const attempts=await Promise.all(Array.from({length:20},()=>docker(args,replaySql)))
  assert.ok(attempts.every(r=>r.code===0),`${family} create race`)
  const result=JSON.parse(attempts[0].out.trim())
  for(const attempt of attempts)assert.deepEqual(JSON.parse(attempt.out.trim()),result)
  const edits=await Promise.all(Array.from({length:20},(_,j)=>docker([...args,'--set=VERBOSITY=sqlstate'],invoke('update',{command_id:`76000000-0000-4000-8000-${String((i+1)*100+j).padStart(12,'0')}`,id:result.id,expected_version:1,title:`Native ${family} CAS`}))))
  assert.equal(edits.filter(r=>r.code===0).length,1,`${family} CAS winner`)
  assert.equal(edits.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19,`${family} CAS conflicts`)
  assert.equal(await sql(`select count(*) from public.product_audit_events where entity_id='${result.id}'`),'2')
  assert.deepEqual(JSON.parse(await sql(replaySql)),result)
 }

 const billing=(name,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.billing_v1_${name}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 const profile={legal_name:'Native Synthetic Fiscal',tax_id:'SYNTHETIC-NOT-VALID',address:'Synthetic Street 1',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
 await sql(billing('issuer_set',{command_id:randomUUID(),expected_version:0,profile,currency:'EUR',default_series:'A'}))
 await sql(billing('customer_fiscal_set',{command_id:randomUUID(),customer_id:id,expected_version:0,profile}))
 const draft={customer_id:id,issue_on:'2026-10-04',due_on:'2026-10-10',series:'A',currency:'EUR',lines:[{description:'Native Synthetic Line',quantity_milli:1000,unit_price_minor:10000,discount_bps:0,tax_bps:2100,withholding_bps:0}]}
 const invoices=await Promise.all(Array.from({length:20},()=>sql(billing('invoice_create_draft',{command_id:randomUUID(),...draft}))))
 const issued=await Promise.all(invoices.map(receipt=>docker(args,billing('invoice_issue',{command_id:randomUUID(),id:JSON.parse(receipt).id,expected_version:1}))))
 assert.ok(issued.every(r=>r.code===0),'billing concurrent issue')
 assert.deepEqual(issued.map(r=>JSON.parse(r.out.trim()).number.sequence).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1))
 assert.equal(await sql(`select next_sequence from public.billing_series where workspace_id='${workspace}' and series='A' and year=2026`),'21')
 const duplicateDraft=JSON.parse(await sql(billing('invoice_create_draft',{command_id:randomUUID(),...draft})))
 const issueCommand={command_id:randomUUID(),id:duplicateDraft.id,expected_version:1}
 const duplicates=await Promise.all(Array.from({length:20},()=>docker(args,billing('invoice_issue',issueCommand))))
 assert.ok(duplicates.every(r=>r.code===0),'billing duplicate issue')
 const issueReceipt=JSON.parse(duplicates[0].out.trim())
 for(const result of duplicates)assert.deepEqual(JSON.parse(result.out.trim()),issueReceipt)
 assert.equal(issueReceipt.number.sequence,21)
 assert.equal(await sql(`select count(*) from public.product_audit_events where entity_id='${duplicateDraft.id}'`),'2')
 const distinctDraft=JSON.parse(await sql(billing('invoice_create_draft',{command_id:randomUUID(),...draft})))
 const competing=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],billing('invoice_issue',{command_id:randomUUID(),id:distinctDraft.id,expected_version:1}))))
 assert.equal(competing.filter(r=>r.code===0).length,1)
 assert.equal(competing.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 assert.equal(await sql(`select next_sequence from public.billing_series where workspace_id='${workspace}' and series='A' and year=2026`),'23')
 familyReplays.push(billing('invoice_issue',issueCommand))
 console.log('BILLING NATIVE RACES PASS: 20 distinct simultaneous issues numbers1..20 / 20 identical issue retries one21 / 20 distinct same-draft attempts one22 and19 CAS conflicts /22 committed numbers')
 await sql(`delete from public.workspace_members where workspace_id='${workspace}' and user_id='${actor}'`)
 const revoked=await docker([...args,'--set=VERBOSITY=sqlstate'],create())
 assert.notEqual(revoked.code,0);assert.match(revoked.err,/42501/)
 for(const replaySql of familyReplays){const revokedFamily=await docker([...args,'--set=VERBOSITY=sqlstate'],replaySql);assert.notEqual(revokedFamily.code,0);assert.match(revokedFamily.err,/42501/)}
 console.log('B3 NATIVE PROCESS RACES PASS: task/meeting/opportunity each 20 creates + 20 CAS edits; one receipt/two audits; replay and revoked replay')
 console.log('PRODUCT NATIVE PROCESS RACES PASS: 20 identical creates / 20 distinct CAS updates / replay / changed-input conflict / revocation; one create and one update audit')
} finally {
 const result=await docker(['dropdb','--force','-U','postgres',database])
 assert.equal(result.code,0,'disposable product race teardown failed')
}
