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
 await sql(`delete from public.workspace_members where workspace_id='${workspace}' and user_id='${actor}'`)
 const revoked=await docker([...args,'--set=VERBOSITY=sqlstate'],create())
 assert.notEqual(revoked.code,0);assert.match(revoked.err,/42501/)
 console.log('PRODUCT NATIVE PROCESS RACES PASS: 20 identical creates / 20 distinct CAS updates / replay / changed-input conflict / revocation; one create and one update audit')
} finally {
 const result=await docker(['dropdb','--force','-U','postgres',database])
 assert.equal(result.code,0,'disposable product race teardown failed')
}
