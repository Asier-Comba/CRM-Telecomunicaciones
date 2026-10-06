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

 const overdue=JSON.parse(await sql(`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.product_v1_task_create('${workspace}','${JSON.stringify({command_id:randomUUID(),title:'Native notification source',due_at:'2000-01-01T00:00:00Z',assigned_user_id:actor})}'::jsonb);commit;`))
 const notify=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.notification_v1_${op}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 const refresh={command_id:randomUUID(),expected_version:0},refreshSQL=notify('refresh',refresh)
 const notificationRace=await Promise.all(Array.from({length:20},()=>docker(args,refreshSQL)))
 assert.ok(notificationRace.every(r=>r.code===0),'notification native replay race')
 const notificationReceipt=JSON.parse(notificationRace[0].out.trim())
 for(const r of notificationRace)assert.deepEqual(JSON.parse(r.out.trim()),notificationReceipt)
 assert.equal(notificationReceipt.affected,1)
 assert.equal(await sql(`select count(*)from public.internal_notifications where target_id='${overdue.id}'`),'1')
 const source=await sql(`select source_key from public.internal_notifications where target_id='${overdue.id}'`)
 const emitRace=await Promise.all(Array.from({length:20},()=>sql(`select public.notification_v1_emit('${workspace}','${actor}','task_overdue','${overdue.id}','${source}')`)))
 assert.equal(new Set(emitRace).size,1,'notification native event dedupe')
 assert.equal(await sql(`select version from public.notification_centers where workspace_id='${workspace}'and user_id='${actor}'`),'2')
 const centerRace=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],notify('refresh',{command_id:randomUUID(),expected_version:2}))))
 assert.equal(centerRace.filter(r=>r.code===0).length,1)
 assert.equal(centerRace.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 console.log('NOTIFICATION NATIVE PROCESS RACES PASS:20 refresh replays/20 event emits one effect/20 distinct center CAS one winner')

 const auto=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.automation_v1_${op}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 const definition=JSON.parse(await sql(auto('create',{command_id:randomUUID(),name:'Native automation',trigger_id:'customer.created',condition:{account_kind:null},action:{action_id:'task.create',recipient_user_id:actor}})))
 await sql(auto('enable',{command_id:randomUUID(),id:definition.id,expected_version:1}))
 const eventCustomer=JSON.parse(await sql(create({command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Native automation event'})))
 const processInputs=Array.from({length:20},()=>({command_id:randomUUID()}))
 const processRaces=await Promise.all(processInputs.map(input=>docker(args,auto('process_pending',input))))
 assert.ok(processRaces.every(r=>r.code===0),'automation native independent processor race')
 const processReceipts=processRaces.map(r=>JSON.parse(r.out.trim()))
 assert.equal(processReceipts.reduce((n,r)=>n+r.succeeded,0),1,'automation one logical action')
 assert.equal(await sql(`select count(*)from public.tasks where customer_id='${eventCustomer.id}'`),'1')
 assert.equal(await sql(`select count(*)from public.internal_automation_runs where automation_id='${definition.id}'`),'1')
 const winner=processReceipts.findIndex(r=>r.succeeded===1)
 const processReplays=await Promise.all(Array.from({length:20},()=>sql(auto('process_pending',processInputs[winner]))))
 for(const r of processReplays)assert.deepEqual(JSON.parse(r),processReceipts[winner])
 console.log('AUTOMATION NATIVE PROCESS RACES PASS:20 distinct processors one canonical task/run;20 winner replays exact receipt')

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
 const portfolio=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.portfolio_v1_${op.replace('.','_')}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 const operator=randomUUID()
 await sql(`insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${workspace}','native-portfolio-race','Native Synthetic Operator')`)
 let contract,service
 for(const family of ['contract','service','line']){
  const input={command_id:randomUUID(),...(family==='contract'?{customer_id:id,operator_id:operator,start_date:'2026-01-01'}:family==='service'?{contract_id:contract,service_kind:'mobile',display_name:'Native Synthetic Service'}:{service_id:service,display_name:'Native Synthetic Line'})}
  const replaySql=portfolio(family+'.create_manual',input);familyReplays.push(replaySql)
  const attempts=await Promise.all(Array.from({length:20},()=>docker(args,replaySql)))
  assert.ok(attempts.every(r=>r.code===0),`${family} portfolio create race`)
  const receipt=JSON.parse(attempts[0].out.trim())
  for(const attempt of attempts)assert.deepEqual(JSON.parse(attempt.out.trim()),receipt)
  if(family==='contract')contract=receipt.id;if(family==='service')service=receipt.id
  const action=family==='contract'?'update_allowed_metadata':'update_label',fields=family==='contract'?{assigned_user_id:null}:{display_name:'Native Human Label'}
  const edits=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],portfolio(family+'.'+action,{command_id:randomUUID(),id:receipt.id,expected_version:1,...fields}))))
  assert.equal(edits.filter(r=>r.code===0).length,1,`${family} portfolio CAS winner`)
  assert.equal(edits.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19,`${family} portfolio CAS conflicts`)
  assert.equal(await sql(`select count(*)from public.product_audit_events where entity_id='${receipt.id}'`),'2')
 }
 const catalog=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.catalog_v1_command('${workspace}','${op}','${JSON.stringify(input)}'::jsonb);commit;`
 const catalogPlan=JSON.parse(await sql(catalog('plan.create',{command_id:randomUUID(),operator_id:operator,code:'native_commercial_plan',display_name:'Native Synthetic Commercial Plan',service_kind:'mobile'})))
 const commercialInput={command_id:randomUUID(),plan_id:catalogPlan.id,expected_version:1,valid_from:'2026-01-01',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'1299',one_time_amount_minor:'0',is_bundle:false,components:[{component_kind:'base',service_kind:'mobile',addon_code:null,quantity:1}],entitlements:[{code:'unlimited_voice',component_position:1,integer_value:null,boolean_value:true,text_value:null}]}
 const commercialSQL=catalog('plan_version.create',commercialInput)
 const commercialReplays=await Promise.all(Array.from({length:20},()=>docker(args,commercialSQL)))
 assert.ok(commercialReplays.every(r=>r.code===0),'commercial version same-key replay race');const commercialReceipt=JSON.parse(commercialReplays[0].out.trim());for(const r of commercialReplays)assert.deepEqual(JSON.parse(r.out.trim()),commercialReceipt);familyReplays.push(commercialSQL)
 const commercialVersions=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],catalog('plan_version.create',{...commercialInput,command_id:randomUUID(),expected_version:2,valid_from:'2027-01-01',valid_until:'2027-12-31'}))))
 assert.equal(commercialVersions.filter(r=>r.code===0).length,1);assert.equal(commercialVersions.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 assert.equal(await sql(`select count(*)from public.telecom_plan_versions where plan_id='${catalogPlan.id}'`),'2')
 assert.equal(await sql(`select count(*)from public.telecom_plan_version_publications where plan_version_id='${commercialReceipt.id}'`),'1')
 console.log('COMMERCIAL CATALOG NATIVE RACES PASS:20 identical publication receipts/20 distinct next versions one parent-CAS winner/immutable frozen version history/revoked replay below')
 // Protected identifiers: independent psql processes, same-key receipts and distinct-key uniqueness.
 const protectedLine=JSON.parse(await sql(portfolio('line.create_manual',{command_id:randomUUID(),service_id:service,display_name:'Native Synthetic Protected Line'})))
 const ident=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.identifier_v1_command('${workspace}','${op}','${JSON.stringify(input)}'::jsonb);commit;`
 const protectedInput={command_id:randomUUID(),entity_kind:'line',entity_id:protectedLine.id,identifier_kind:'msisdn',canonical_value:'+12025550123'},protectedSQL=ident('identifier.create_manual',protectedInput)
 const protectedReplays=await Promise.all(Array.from({length:20},()=>docker(args,protectedSQL)))
 assert.ok(protectedReplays.every(r=>r.code===0),'identifier create replay race')
 const protectedReceipt=JSON.parse(protectedReplays[0].out.trim());for(const r of protectedReplays)assert.deepEqual(JSON.parse(r.out.trim()),protectedReceipt)
 familyReplays.push(protectedSQL)
 const identifierEdits=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],ident('identifier.retire',{command_id:randomUUID(),id:protectedReceipt.id,expected_version:1}))))
 assert.equal(identifierEdits.filter(r=>r.code===0).length,1);assert.equal(identifierEdits.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const identifierAssignments=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],ident('identifier.create_manual',{...protectedInput,command_id:randomUUID(),canonical_value:'+12025550124'}))))
 assert.equal(identifierAssignments.filter(r=>r.code===0).length,1);assert.equal(identifierAssignments.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 assert.equal(await sql(`select count(*)from public.telecom_identifiers where workspace_id='${workspace}'and line_id='${protectedLine.id}'`),'2')
 assert.deepEqual(JSON.parse(await sql(protectedSQL)),protectedReceipt)
 console.log('PROTECTED IDENTIFIER NATIVE RACES PASS:20 identical create receipts/20 retire CAS one winner/20 distinct assignments one winner/history retained/revoked replay below')

 const port=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.portability_v1_command('${workspace}','${op}','${JSON.stringify(input)}'::jsonb);commit;`
 const portLine=JSON.parse(await sql(portfolio('line.create_manual',{command_id:randomUUID(),service_id:service,display_name:'Native Synthetic Port Line'})))
 const portNumber=JSON.parse(await sql(ident('identifier.create_manual',{command_id:randomUUID(),entity_kind:'line',entity_id:portLine.id,identifier_kind:'msisdn',canonical_value:'+12025550182'})))
 const donor=JSON.parse(await sql(catalog('operator.create',{command_id:randomUUID(),code:'native_port_donor',display_name:'Native Synthetic Donor'})))
 const portInput={command_id:randomUUID(),line_id:portLine.id,number_identifier_id:portNumber.id,direction:'inbound',donor_operator_id:donor.id,target_operator_id:operator,requested_on:'2026-02-01',owner_user_id:null}
 const openRaces=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],port('portability.create',{...portInput,command_id:randomUUID()}))))
 assert.equal(openRaces.filter(r=>r.code===0).length,1);assert.equal(openRaces.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const openReceipt=JSON.parse(openRaces.find(r=>r.code===0).out.trim())
 const transitions=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],port('portability.transition',{command_id:randomUUID(),id:openReceipt.id,expected_version:1,status:'requested',effective_on:'2026-02-02',reason_code:null,evidence_source:'manual'}))))
 assert.equal(transitions.filter(r=>r.code===0).length,1);assert.equal(transitions.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 await sql(port('portability.transition',{command_id:randomUUID(),id:openReceipt.id,expected_version:2,status:'scheduled',effective_on:'2026-02-03',reason_code:null,evidence_source:'manual'}))
 const completionSQL=port('portability.complete',{command_id:randomUUID(),id:openReceipt.id,expected_version:3,completed_on:'2026-02-04',evidence_source:'manual',provider_outcome:'confirmed_completed',line_action:'none',expected_line_version:null})
 const completions=await Promise.all(Array.from({length:20},()=>docker(args,completionSQL)));assert.ok(completions.every(r=>r.code===0));const completionReceipt=JSON.parse(completions[0].out.trim());for(const r of completions)assert.deepEqual(JSON.parse(r.out.trim()),completionReceipt);familyReplays.push(completionSQL)
 assert.equal(await sql(`select status from public.telecom_lines where id='${portLine.id}'`),'pending','no implicit provider provisioning')
 const createSQL=port('portability.create',{...portInput,command_id:randomUUID(),requested_on:'2026-03-01'})
 const createReplays=await Promise.all(Array.from({length:20},()=>docker(args,createSQL)));assert.ok(createReplays.every(r=>r.code===0));const createReceipt=JSON.parse(createReplays[0].out.trim());for(const r of createReplays)assert.deepEqual(JSON.parse(r.out.trim()),createReceipt);familyReplays.push(createSQL)
 assert.equal(await sql(`select count(*)from public.telecom_portabilities where line_id='${portLine.id}'`),'2')
 console.log('COMMERCIAL PORTABILITY NATIVE RACES PASS:20 open assignments one winner/20 transitions CAS one winner/20 completion replays/20 create replays/history preserved/no implicit line action/revoked replay below')

 const cases=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.case_v1_command('${workspace}','${op}','${JSON.stringify(input)}'::jsonb);commit;`
 const caseInput={command_id:randomUUID(),customer_id:id,contract_id:contract,service_id:service,line_id:null,case_type:'technical',title:'Native Synthetic Case',priority:'urgent',due_on:'2000-01-01',assigned_user_id:null},caseSQL=cases('case.create',caseInput)
 const caseCreates=await Promise.all(Array.from({length:20},()=>docker(args,caseSQL)));assert.ok(caseCreates.every(r=>r.code===0));const caseReceipt=JSON.parse(caseCreates[0].out.trim());for(const r of caseCreates)assert.deepEqual(JSON.parse(r.out.trim()),caseReceipt);familyReplays.push(caseSQL)
 const caseTransitions=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],cases('case.change_status',{command_id:randomUUID(),id:caseReceipt.id,expected_version:1,status:'in_progress'}))))
 assert.equal(caseTransitions.filter(r=>r.code===0).length,1);assert.equal(caseTransitions.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const caseNotes=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],cases('case.note_create',{command_id:randomUUID(),id:caseReceipt.id,expected_version:2,body:'Native synthetic private CAS note'}))))
 assert.equal(caseNotes.filter(r=>r.code===0).length,1);assert.equal(caseNotes.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const noteSQL=cases('case.note_create',{command_id:randomUUID(),id:caseReceipt.id,expected_version:3,body:'Native synthetic private replay note'})
 const noteReplays=await Promise.all(Array.from({length:20},()=>docker(args,noteSQL)));assert.ok(noteReplays.every(r=>r.code===0));const noteReceipt=JSON.parse(noteReplays[0].out.trim());for(const r of noteReplays)assert.deepEqual(JSON.parse(r.out.trim()),noteReceipt);familyReplays.push(noteSQL)
 assert.equal(await sql(`select count(*)from public.service_case_internal_notes where case_id='${caseReceipt.id}'`),'2')
 const resolutions=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],cases('case.resolve',{command_id:randomUUID(),id:caseReceipt.id,expected_version:4,resolution_code:'issue_fixed'}))))
 assert.equal(resolutions.filter(r=>r.code===0).length,1);assert.equal(resolutions.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 assert.deepEqual(JSON.parse(await sql(noteSQL)),noteReceipt)
 console.log('SERVICE CASE NATIVE RACES PASS:20 exact creates/20statusCAS one winner/20noteCAS one winner/20exact note receipts/20resolutionCAS one winner/private append-only history/revoked replay below')

 const sims=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.sim_v1_command('${workspace}','${op}','${JSON.stringify(input)}'::jsonb);commit;`
 const simLine=JSON.parse(await sql(portfolio('line.create_manual',{command_id:randomUUID(),service_id:service,display_name:'Native Synthetic SIM Line'})))
 const simInput={command_id:randomUUID(),customer_id:id,operator_id:operator,kind:'physical',display_label:'Native Synthetic Physical SIM'},simSQL=sims('sim.create',simInput)
 const simCreates=await Promise.all(Array.from({length:20},()=>docker(args,simSQL)));assert.ok(simCreates.every(r=>r.code===0));const simReceipt=JSON.parse(simCreates[0].out.trim());for(const r of simCreates)assert.deepEqual(JSON.parse(r.out.trim()),simReceipt);familyReplays.push(simSQL)
 await sql(ident('identifier.create_manual',{command_id:randomUUID(),entity_kind:'sim',entity_id:simReceipt.id,identifier_kind:'iccid',canonical_value:'8900000000000000290'}))
 const simAssignments=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],sims('sim.assign',{command_id:randomUUID(),id:simReceipt.id,expected_version:1,line_id:simLine.id,expected_line_version:1}))))
 assert.equal(simAssignments.filter(r=>r.code===0).length,1);assert.equal(simAssignments.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 await sql(sims('sim.activate',{command_id:randomUUID(),id:simReceipt.id,expected_version:2,expected_line_version:1,evidence_source:'manual',provider_confirmation:'confirmed_active'}))
 const replacementInputs=[],simCandidates=[]
 for(let i=0;i<20;i++){
  const candidate=JSON.parse(await sql(sims('sim.create',{...simInput,command_id:randomUUID(),kind:'esim',display_label:'Native Synthetic eSIM '+i})))
  simCandidates.push(candidate)
  replacementInputs.push({command_id:randomUUID(),id:simReceipt.id,expected_version:3,replacement_sim_id:candidate.id,expected_replacement_version:1,expected_line_version:1,replacement_status:'active',evidence_source:'manual',provider_confirmation:'confirmed_active'})
 }
 const simIdentifierInputs=simCandidates.map(candidate=>({command_id:randomUUID(),entity_kind:'sim',entity_id:candidate.id,identifier_kind:'iccid',canonical_value:'8900000000000000350'}))
 const simIdentifierRaces=await Promise.all(simIdentifierInputs.map(i=>docker([...args,'--set=VERBOSITY=sqlstate'],ident('identifier.create_manual',i))))
 assert.equal(simIdentifierRaces.filter(r=>r.code===0).length,1);assert.equal(simIdentifierRaces.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const simIdentifierWinner=simIdentifierRaces.findIndex(r=>r.code===0),simIdentifierReceipt=JSON.parse(simIdentifierRaces[simIdentifierWinner].out.trim())
 await sql(ident('identifier.retire',{command_id:randomUUID(),id:simIdentifierReceipt.id,expected_version:1}))
 for(const[i,candidate]of simCandidates.entries())await sql(ident('identifier.create_manual',{command_id:randomUUID(),entity_kind:'sim',entity_id:candidate.id,identifier_kind:'iccid',canonical_value:'89'+String(300+i).padStart(17,'0')}))
 const simReplacements=await Promise.all(replacementInputs.map(i=>docker([...args,'--set=VERBOSITY=sqlstate'],sims('sim.replace',i))))
 assert.equal(simReplacements.filter(r=>r.code===0).length,1);assert.equal(simReplacements.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19,'replacement losers must be CAS conflicts; SQLSTATEs: '+simReplacements.filter(r=>r.code!==0).map(r=>r.err.match(/ERROR:\s+([A-Z0-9]{5})/)?.[1]??'unclassified').join(','))
 const replacementWinner=simReplacements.findIndex(r=>r.code===0),replacementReceipt=JSON.parse(simReplacements[replacementWinner].out.trim()),replacementSQL=sims('sim.replace',replacementInputs[replacementWinner])
 const replacementReplays=await Promise.all(Array.from({length:20},()=>docker(args,replacementSQL)));assert.ok(replacementReplays.every(r=>r.code===0));for(const r of replacementReplays)assert.deepEqual(JSON.parse(r.out.trim()),replacementReceipt);familyReplays.push(replacementSQL)
 assert.equal(await sql(`select count(*)from public.telecom_sim_associations where line_id='${simLine.id}'`),'2');assert.equal(await sql(`select count(*)from public.telecom_sim_associations where line_id='${simLine.id}'and ended_at is null`),'1')
 assert.equal(await sql(`select status from public.telecom_sims where id='${simReceipt.id}'`),'replaced');assert.equal(await sql(`select status from public.telecom_lines where id='${simLine.id}'`),'pending','no implicit network/line activation')
 await sql(sims('sim.deactivate',{command_id:randomUUID(),id:replacementReceipt.replacement_id,expected_version:2,expected_line_version:1,evidence_source:'manual'}));assert.deepEqual(JSON.parse(await sql(replacementSQL)),replacementReceipt)
 console.log('SIM ESIM NATIVE RACES PASS:20exact creates/20assignmentCAS one winner/20ICCID lifetime assignments one winner/20distinct prepared replacements one winner/20exact replacement receipts/closed old associations and identity retained/no implicit line activation/revoked replay below')
 // Independent parent closure vs child creation must never both commit.
 for(let i=0;i<5;i++){
  const parent=JSON.parse(await sql(portfolio('contract.create_manual',{command_id:randomUUID(),customer_id:id,operator_id:operator,start_date:'2026-01-01'})))
  const competing=await Promise.all([
   docker([...args,'--set=VERBOSITY=sqlstate'],portfolio('contract.cancel',{command_id:randomUUID(),id:parent.id,expected_version:1})),
   docker([...args,'--set=VERBOSITY=sqlstate'],portfolio('service.create_manual',{command_id:randomUUID(),contract_id:parent.id,service_kind:'mobile',display_name:'Concurrent Child'}))
  ])
  assert.equal(competing.filter(r=>r.code===0).length,1,'parent closure / child creation one winner')
  assert.equal(competing.filter(r=>r.code!==0&&/22023/.test(r.err)).length,1)
 }
 for(const [family,op,fields,update,changes]of [
  ['renewal','contract.record_renewal',{contract_id:contract,target_on:'2027-01-01',opens_on:null,closes_on:null},'renewal.update',{target_on:'2027-02-01',opens_on:null,closes_on:null}],
  ['permanence','permanence.create_manual',{contract_id:contract,commitment_kind:'minimum_term',starts_on:'2026-01-01',ends_on:'2027-01-01',reason_code:'manual_term'},'permanence.update',{starts_on:'2026-01-01',ends_on:'2027-02-01',reason_code:'manual_amended'}]
 ]){
  const replaySql=portfolio(op,{command_id:randomUUID(),...fields});familyReplays.push(replaySql)
  const attempts=await Promise.all(Array.from({length:20},()=>docker(args,replaySql)))
  assert.ok(attempts.every(r=>r.code===0),`${family} deadline create race`)
  const receipt=JSON.parse(attempts[0].out.trim());for(const attempt of attempts)assert.deepEqual(JSON.parse(attempt.out.trim()),receipt)
  const edits=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],portfolio(update,{command_id:randomUUID(),id:receipt.id,expected_version:1,...changes}))))
  assert.equal(edits.filter(r=>r.code===0).length,1,`${family} deadline CAS winner`)
  assert.equal(edits.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
  assert.equal(await sql(`select count(*)from public.product_audit_events where entity_id='${receipt.id}'`),'2')
 }
 console.log('PORTFOLIO DEADLINE NATIVE RACES PASS: renewal/permanence each20 identical creates +20 CAS edits; revoked replay below')
 console.log('PORTFOLIO NATIVE RACES PASS: contract/service/line each20 identical creates +20 CAS edits; ancestor-first closure vs child creation5 races; revoked replay below')
 const document=randomUUID(),object=randomUUID(),documentCommand=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.document_v1_${op}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 await sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,storage_path)values('${document}','${workspace}','${id}','general','Sensitive Synthetic.pdf','${workspace}/documents/${document}/${object}')`)
 const documentArchives=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],documentCommand('archive',{command_id:randomUUID(),id:document,expected_version:1}))))
 assert.equal(documentArchives.filter(r=>r.code===0).length,1);assert.equal(documentArchives.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
 const restore={command_id:randomUUID(),id:document,expected_version:2},restoreSql=documentCommand('restore',restore);familyReplays.push(restoreSql)
 const documentRestores=await Promise.all(Array.from({length:20},()=>docker(args,restoreSql)))
 assert.ok(documentRestores.every(r=>r.code===0));const restoredDocument=JSON.parse(documentRestores[0].out.trim());for(const attempt of documentRestores)assert.deepEqual(JSON.parse(attempt.out.trim()),restoredDocument)
 assert.equal(await sql(`select count(*)from public.product_audit_events where entity_id='${document}'`),'2')
 console.log('DOCUMENT NATIVE RACES PASS:20 CAS archives one winner /20 identical restore replays /two audits; revoked replay below')
 const contentCommand=(op,input)=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';select public.document_content_v1_${op}('${workspace}','${JSON.stringify(input)}'::jsonb);commit;`
 for(const sameKey of [true,false]){
  const pending=JSON.parse(await sql(contentCommand('request_upload',{command_id:randomUUID(),target_kind:'customer',target_id:id,document_kind:'general',file_name:'Synthetic native.pdf',media_type:'application/pdf',size_bytes:32})))
  const path=await sql(`select storage_path from public.documents where id='${pending.id}'`)
  await sql(`insert into storage.objects(id,bucket_id,name,metadata)values('${randomUUID()}','telecom-documents','${path}','{"size":32,"mimetype":"application/pdf"}')`)
  const input={command_id:randomUUID(),id:pending.id,expected_version:1},query=contentCommand('finalize_upload',input)
  const attempts=await Promise.all(Array.from({length:20},()=>docker([...args,'--set=VERBOSITY=sqlstate'],sameKey?query:contentCommand('finalize_upload',{...input,command_id:randomUUID()}))))
  assert.equal(attempts.filter(r=>r.code===0).length,sameKey?20:1)
  if(sameKey){const first=JSON.parse(attempts[0].out.trim());for(const attempt of attempts)assert.deepEqual(JSON.parse(attempt.out.trim()),first);familyReplays.push(query)}
  else assert.equal(attempts.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19)
  assert.equal(await sql(`select version from public.documents where id='${pending.id}'`),'2')
  assert.equal(await sql(`select count(*)from public.product_audit_events where entity_id='${pending.id}'`),'2')
 }
 console.log('DOCUMENT CONTENT NATIVE RACES PASS:20 identical finalizations one receipt /20 distinct CAS finalizations one winner; one activation/two audits')
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
