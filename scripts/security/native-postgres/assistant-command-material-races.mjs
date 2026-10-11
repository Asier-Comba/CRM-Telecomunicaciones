// Partial native command-material proof, using the CI-owned disposable cluster.
// Business effects, full V3 crash/restart driver and independent W4 acceptance OFF.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {CAPABILITY_CONTRACT_VERSION} from '../../../src/assistant/contracts.ts'
import {argumentsDigest,canonicalArgumentsV1} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
assert.match(container,/^[0-9a-f]{12,64}$/)
const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.ok(isExpectedNativeImage(image.stdout.trim()))
const database='telecom_test',workspace='b2000000-0000-4000-8000-000000000001',actor='a1000000-0000-4000-8000-000000000001'
const customer='d4000000-0000-4000-8000-000000000001',nonce=randomBytes(12).toString('hex'),capability='fixture.material.n'+nonce
const args=['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
const auth=`set request.jwt.claim.sub='${actor}';`,owned=new Set(),processes=[],backends=[]
const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
function run(input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});owned.add(child)
 let out='',err='',timedOut=false
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},30000)
 child.stdout.on('data',b=>{out+=b;if(out.length>32768)child.kill('SIGKILL')})
 child.stderr.on('data',b=>{err+=b;if(err.length>32768)child.kill('SIGKILL')})
 child.on('error',e=>{clearTimeout(timer);owned.delete(child);reject(e)})
 child.on('close',code=>{clearTimeout(timer);owned.delete(child);resolve({code,out,err,pid:child.pid,timedOut})})
 child.stdin.end("set log_min_error_statement='panic';set log_error_verbosity='terse';"+input)
})}
async function sql(input){const r=await run(input);assert.equal(r.code,0,'native material SQL failed');assert.equal(r.timedOut,false);return r.out.trim()}
const input={customerRef:customer,label:'fixture'},digest=argumentsDigest(input)
const binding={actorId:actor,workspaceId:workspace,capability,argumentsDigest:digest}
const authority={authentication:'user_session',actorId:actor,workspaceId:workspace,scopeEpoch:'synthetic_current_membership_v1',permissions:new Set([capability,'fixture:write'])}
const registry=new CapabilityRegistry()
registry.register({contractVersion:CAPABILITY_CONTRACT_VERSION,name:capability,description:'Disposable scoped command-material fixture',
 inputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},
 outputSchema:{type:'null'},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',
 confirmationPolicy:'none',idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},
 authorize:async(context,values)=>({allowed:await sql(`select count(*) from public.customers where id=${literal(values.customerRef)}::uuid and workspace_id=${literal(context.workspaceId)}::uuid;`)==='1'}),
 handler:async()=>{throw new Error('handler_must_not_run')},projectOutput:()=>null})
const producer=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>authority,
 loadDraft:async(current,command)=>{assert.equal(current.workspaceId,workspace);return {binding,command,schemaVersion:1,arguments:input}}})
const rpcFields={assistant_durable_v1_issue:['p_workspace','p_capability','p_digest'],
 assistant_durable_v1_confirm_reserve_material:['p_workspace','p_confirmation','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material']}
let cut=false,loseReply=false,collectRace=false
const port=createDurableMaterialReservationPortV1({authority:async()=>authority,producer,invoke:async(operation,params)=>{
 const fields=rpcFields[operation];assert.ok(fields);assert.deepEqual(Object.keys(params).sort(),[...fields].sort())
 const result=await run(auth+(cut?"set test.assistant.material.cut='on';":'')+`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${operation}(${fields.map(f=>literal(params[f])+(f==='p_material'?'::jsonb':'')).join(',')}));`)
 assert.equal(result.code,0,'native material RPC failed');assert.equal(result.timedOut,false)
 const value=JSON.parse(result.out.trim())
 if(collectRace){processes.push(result.pid);backends.push(value.backend)}
 if(loseReply){loseReply=false;throw new Error('synthetic_postcommit_reply_lost')}
 return {data:value.data,error:null}
}})
const context={...authority,requestId:'material_original_request_'+nonce}
async function fixture(suffix){
 const proof=await port.issueConfirmation(context,binding,new Date(Date.now()+300000))
 return {confirmationRef:proof.operationRef,binding,idempotencyKey:'material_native_key_'+suffix+'_'+nonce,
  command:{dispatcher:capability,commandRef:'material_native_command_'+suffix+'_'+nonce}}
}
const aggregate=()=>sql(`select jsonb_build_object(
 'confirmations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.confirmation_ref),'[]'::jsonb) from public.assistant_confirmations x where x.capability=${literal(capability)}),
 'operations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.operation_ref),'[]'::jsonb) from public.assistant_operations x where x.capability=${literal(capability)}),
 'commands',(select coalesce(jsonb_agg(to_jsonb(x) order by x.command_ref),'[]'::jsonb) from public.assistant_registered_commands x where x.capability=${literal(capability)}),
 'effects',(select coalesce(jsonb_agg(to_jsonb(x) order by x.outbox_ref),'[]'::jsonb) from public.assistant_effect_outbox x where x.capability=${literal(capability)}),
 'originalAudits',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_ref),'[]'::jsonb) from public.assistant_original_audit_intents x where x.capability=${literal(capability)}),
 'auditDelivery',(select coalesce(jsonb_agg(to_jsonb(x) order by x.event_ref),'[]'::jsonb) from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability=${literal(capability)}),
 'material',(select coalesce(jsonb_agg(to_jsonb(x) order by x.command_ref),'[]'::jsonb) from public.assistant_command_material x join public.assistant_registered_commands c using(workspace_id,command_ref) where c.capability=${literal(capability)}));`)
try{
 assert.equal(await sql('select current_database();'),database)
 await sql(`insert into public.assistant_registered_dispatchers values(${literal(capability)},${literal(capability)},1);`)
 const race=await fixture('race');collectRace=true
 const results=await Promise.all(Array.from({length:20},()=>port.confirmReserveEnqueue(context,race)));collectRace=false
 assert.equal(new Set(processes).size,20);assert.equal(new Set(backends).size,20)
 assert.equal(results.filter(r=>r.status==='reserved').length,1);assert.equal(results.filter(r=>r.status==='existing').length,19)
 const ledger=JSON.parse(await aggregate())
 for(const field of ['operations','commands','effects','originalAudits','auditDelivery','material'])assert.equal(ledger[field].length,1)
 assert.equal(ledger.material[0].canonical_arguments,canonicalArgumentsV1(input));assert.equal(ledger.material[0].arguments_digest,digest)
 assert.deepEqual(ledger.material[0].arguments,input);assert.equal(ledger.originalAudits[0].request_ref,context.requestId)
 const original=await aggregate();assert.equal((await port.confirmReserveEnqueue({...context,requestId:'material_replay_request_'+nonce},race)).status,'existing')
 assert.equal(await aggregate(),original)
 const cutFunction='material_native_cut_'+nonce
 await sql(`create function public.${cutFunction}() returns trigger language plpgsql as $$begin if current_setting('test.assistant.material.cut',true)='on' then raise exception 'synthetic_material_cutpoint';end if;return NEW;end$$;
 create trigger ${cutFunction} after insert on public.assistant_command_material for each row execute function public.${cutFunction}();`)
 const rollback=await fixture('rollback'),before=await aggregate();cut=true
 await assert.rejects(port.confirmReserveEnqueue(context,rollback));cut=false
 assert.equal(await aggregate(),before);assert.equal((await port.confirmReserveEnqueue(context,rollback)).status,'reserved')
 await sql(`drop trigger ${cutFunction} on public.assistant_command_material;drop function public.${cutFunction}();`)
 const lost=await fixture('lost');loseReply=true
 await assert.rejects(port.confirmReserveEnqueue(context,lost));const committed=await aggregate()
 assert.equal((await port.confirmReserveEnqueue({...context,requestId:'material_lost_retry_'+nonce},lost)).status,'existing');assert.equal(await aggregate(),committed)
 const migration=readFileSync('supabase/migrations/20261011050000_assistant_command_material.sql','utf8').replace(/\r\n/g,'\n')
 const from=migration.indexOf('create function public.assistant_durable_v1_confirm_reserve_material('),to=migration.indexOf('revoke all on function public.assistant_durable_v1_confirm_reserve_material(',from)
 const definition=migration.slice(from,to),remove=/  insert into public\.assistant_command_material\(workspace_id,command_ref,schema_version,arguments_digest,digest_algorithm,\n   producer_runtime,canonical_arguments,created_at\)\n  values\(p_workspace,p_command,version_id,p_digest,'w3-canonical-json-localeCompare-sha256-v1',runtime_value,canonical_value,c\.created_at\);/
 assert.ok(remove.test(definition))
 const query="select pg_get_functiondef('public.assistant_durable_v1_confirm_reserve_material(uuid,text,text,text,text,text,text,text,jsonb)'::regprocedure);",beforeDefinition=await sql(query)
 const mutant=await run('begin;'+definition.replace('create function','create or replace function').replace(remove,'  null;')+readFileSync('supabase/tests/assistant-command-material.sql','utf8'))
 assert.notEqual(mutant.code,0);assert.equal(mutant.timedOut,false);assert.ok(mutant.err.includes('material_cutpoint_not_detected'));assert.equal(await sql(query),beforeDefinition)
 console.log('COMMAND MATERIAL NATIVE PASS: actual registered producer and reservation constructor;20 distinct processes/backends one atomic reservation/material;full rollback after material insert and retry;postcommit reply-loss exact replay;missing-material insert mutant rejected and exact definition restored. NO effect/SIGKILL/restart/full23/W4 acceptance.')
}finally{for(const child of owned)child.kill('SIGKILL')}
