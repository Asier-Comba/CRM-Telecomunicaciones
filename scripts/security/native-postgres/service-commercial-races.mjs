import { randomUUID } from 'node:crypto'
// Native independent-process evidence, only in the pinned disposable CI container.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
const container = process.env.TELECOM_NATIVE_TEST_CONTAINER ?? ''
assert.match(container, /^[0-9a-f]{12,64}$/)
const image = spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.match(image.stdout.trim(),/^postgres:16/)
const database='telecom_service_commercial_race_test'
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

const quote=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb"
const auth=q=>`begin;set local role authenticated;set local request.jwt.claim.sub='${actor}';${q}commit;`
const statement=(name,input,op)=>`select public.${name}('${workspace}',${op?"'"+op+"',":""}${quote(input)});`
const invoke=async(name,input,op)=>JSON.parse(await sql(auth(statement(name,input,op))))
try{
 assert.equal((await docker(['createdb','-U','postgres',database])).code,0)
 await sql(readFileSync('scripts/security/native-postgres/bootstrap.sql','utf8').replace(/create role (anon|authenticated|service_role)[^;]*;/g,''))
 await sql(readFileSync('scripts/security/ephemeral-postgres/storage-stub.sql','utf8'))
 for(const migration of readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort())await sql(readFileSync('supabase/migrations/'+migration,'utf8'))
 await sql("set app.environment='test';"+readFileSync('supabase/seeds/synthetic_portfolio.sql','utf8'))
 const operator=await invoke('catalog_v1_command',{command_id:randomUUID(),code:'synthetic_installation_race',display_name:'Synthetic Native Service Operator'},'operator.create')
 const plan=await invoke('catalog_v1_command',{command_id:randomUUID(),operator_id:operator.id,code:'synthetic_installation_plan',display_name:'Synthetic Native Fixed Plan',service_kind:'fiber'},'plan.create')
 const version=await invoke('catalog_v1_command',{command_id:randomUUID(),plan_id:plan.id,expected_version:1,valid_from:'2026-01-01',valid_until:null,currency:'EUR',recurring_amount_minor:'4900',one_time_amount_minor:'9900',is_bundle:false,components:[{component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1},{component_kind:'add_on',service_kind:'fiber',addon_code:'static_ip',quantity:2}],entitlements:[]},'plan_version.create')
 const customer=await invoke('product_v1_customer_create',{command_id:randomUUID(),account_kind:'legal_entity',legal_name:'Synthetic Native Installation Account'})
 const contract=await invoke('portfolio_v1_contract_create_manual',{command_id:randomUUID(),customer_id:customer.id,operator_id:operator.id,plan_version_id:version.id,start_date:'2026-01-01'})
 const service=await invoke('portfolio_v1_service_create_manual',{command_id:randomUUID(),contract_id:contract.id,plan_version_id:version.id,service_kind:'fiber',display_name:'Synthetic Native Installation Service'})
 const run=async(op,base,rpcName='service_commercial_v1_command')=>{
 const inputs=Array.from({length:20},()=>({...base,command_id:randomUUID()}))
 const results=await Promise.all(inputs.map(input=>docker([...args,'--set=VERBOSITY=sqlstate'],auth(statement(rpcName,input,op)))))
 assert.equal(results.filter(r=>r.code===0).length,1,'commercial resource CAS must have one winner')
 assert.equal(results.filter(r=>r.code!==0&&/40001/.test(r.err)).length,19,'all commercial resource CAS losers must be conflicts')
 const ix=results.findIndex(r=>r.code===0);return{input:inputs[ix],receipt:JSON.parse(results[ix].out.trim()),op,rpcName}
 }
 const installation=await run('service.installation_set',{service_id:service.id,expected_service_version:1,expected_details_version:0,site_label:'Synthetic Native Site',installation_contact_id:null,activation_target_on:'2026-10-20'})
 assert.equal(installation.receipt.service_version,2);assert.equal(installation.receipt.version,1)
 const addon=await run('service.addon_assign',{service_id:service.id,expected_service_version:2,component_position:2,quantity:1,valid_from:'2026-01-01',valid_until:null})
 assert.equal(addon.receipt.service_version,3);assert.equal(addon.receipt.version,1)
 const location=await invoke('service_location_v1_command',{command_id:randomUUID(),customer_id:customer.id,label:'Synthetic Native Site',address_line1:'Synthetic Private Native Street 42',address_line2:null,postal_code:'00000',city:'Synthetic City',region:null,country:'ES'},'service_location.create')
 const locationAssignment=await run('service_location.assign',{service_id:service.id,location_id:location.id,expected_service_version:3,expected_details_version:1},'service_location_v1_command')
 assert.equal(locationAssignment.receipt.service_version,4);assert.equal(locationAssignment.receipt.version,2)
 const gear=await invoke('equipment_v1_command',{command_id:randomUUID(),customer_id:customer.id,contract_id:contract.id,service_id:service.id,line_id:null,commitment_id:null,kind:'router',manufacturer:'Synthetic Maker',model:'Synthetic Original Native Router',commercial_description:null,purchased_on:'2026-01-01',assigned_on:'2026-01-01'},'equipment.create')
 const gearReplacement=await run('equipment.replace',{id:gear.id,expected_version:1,event_on:'2026-01-03',manufacturer:'Synthetic New Maker',model:'Synthetic New Native Router',commercial_description:null,purchased_on:'2026-01-02',commitment_id:null},'equipment_v1_command')
 assert.equal(gearReplacement.receipt.version,2);assert.equal(gearReplacement.receipt.replacement_version,1)

 for(const winner of[installation,addon,locationAssignment,gearReplacement]){const results=await Promise.all(Array.from({length:20},()=>docker(args,auth(statement(winner.rpcName,winner.input,winner.op)))));for(const r of results){assert.equal(r.code,0);assert.deepEqual(JSON.parse(r.out.trim()),winner.receipt)}}
 const inspect=()=>sql(`select jsonb_build_object('service_version',(select version from public.telecom_services where id='${service.id}'),'installation_rows',(select count(*)from public.telecom_service_installations where service_id='${service.id}'),'addon_rows',(select count(*)from public.telecom_service_addon_assignments where service_id='${service.id}'),'location_rows',(select count(*)from public.telecom_service_locations where id='${location.id}'),'assignment_rows',(select count(*)from public.telecom_service_location_assignments where service_id='${service.id}'),'equipment_rows',(select count(*)from public.telecom_equipment),'equipment_history',(select count(*)from public.telecom_equipment_events),'equipment_preserved',(select status='replaced'and model='Synthetic Original Native Router'and replaced_by_id='${gearReplacement.receipt.replacement_id}'from public.telecom_equipment where id='${gear.id}'),'service_pending',(select status='pending'and activated_on is null from public.telecom_services where id='${service.id}'));`)
 const before=await inspect();assert.deepEqual(JSON.parse(before),{service_version:4,installation_rows:1,addon_rows:1,location_rows:1,assignment_rows:1,equipment_rows:2,equipment_history:3,equipment_preserved:true,service_pending:true})
 await sql(`update public.workspace_members set status='suspended'where workspace_id='${workspace}'and user_id='${actor}';`)
 for(const winner of[installation,addon,locationAssignment,gearReplacement]){const r=await docker([...args,'--set=VERBOSITY=sqlstate'],auth(statement(winner.rpcName,winner.input,winner.op)));assert.notEqual(r.code,0);assert.match(r.err,/42501/)}
 assert.equal(await inspect(),before)
 console.log('SERVICE COMMERCIAL NATIVE INDEPENDENT PROCESS RACES PASS: installation, addon, location assignment and equipment replacement each20 writers/one winner19CAS; each20exact replays; revoked replay denied/no mutation/no implicit activation')
}finally{const r=await docker(['dropdb','--force','-U','postgres',database]);assert.equal(r.code,0,'disposable service commercial race teardown failed')}
