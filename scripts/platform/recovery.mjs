import {createClient} from '@supabase/supabase-js'
import {randomBytes,randomUUID} from 'node:crypto'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join,resolve,sep,basename} from 'node:path'
import {tmpdir} from 'node:os'
import {encryptBackup,decryptBackup,captureStorage,restoreStorage,verifyBundle,storageTargetGuard} from './backup.mjs'
import {disposableGuard,root,migrations,hash} from './lib.mjs'
import {checkRpcManifest} from './rpc-manifest.mjs'
import {storageReady} from './storage-ready.mjs'
import {recoveryManifest,verifyRecoveryManifest} from './recovery-manifest.mjs'
import {verifyRestoredPrivateResponses,verifyRestoredRpcDenial} from './restored-authorization.mjs'
const clientOptions={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,options={})=>fetch(input,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}}
// Called only inside run-stack after real Auth/Storage acceptance. It never takes
// a caller-selected database, Docker container, URL or key from CLI arguments.
export async function recoveryRehearsal({url,anon,service,db,command,report,users,wa,wb,object}){
 disposableGuard();storageTargetGuard(url)
 if(!/^supabase_db_crm-telecom-local$/.test(db))throw new Error('RECOVERY_DB_TARGET_REJECTED')
 const start=Date.now(),key=randomBytes(32),scratch=mkdtempSync(join(tmpdir(),'crm-synthetic-recovery-'))
 const sql=s=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:s})
 const metadata=()=>({privileges:JSON.parse(sql(readFileSync(join(root,'scripts/security/native-postgres/privilege-snapshot.sql'),'utf8'))),schema:JSON.parse(sql(readFileSync(join(root,'scripts/platform/drift.sql'),'utf8')))})
 const rows=()=>JSON.parse(sql(readFileSync(join(root,'scripts/platform/row-hashes.sql'),'utf8')))
 try{
  report.recovery_stage='capture'
  // Disposable late role downgrade: old Auth tokens and application role caches
  // must not retain the former admin authority after canonical reconstruction.
  sql(`update public.workspace_members set role='viewer' where workspace_id='${wa}' and user_id='${users.adminA.id}' and status='active';`)
  const expected=metadata(),expectedRows=rows()
  try{report.rpc_manifest=checkRpcManifest(expected.privileges)}catch(e){
   if(e.message==='PUBLIC_RPC_MANIFEST_DRIFT')report.rpc_manifest_drift=e.differences
   throw e
  }
  if(JSON.stringify(expected.schema.migrations)!==JSON.stringify(migrations().map(m=>m.version)))throw new Error('MIGRATION_VERSION_DRIFT')
  // Obtain DB bytes without terminal conversion or echoing any contents.
  const dump=command('docker',['exec',db,'pg_dump','-U','postgres','-d','postgres','--format=custom','--data-only','--table=public.*','--table=auth.users','--table=auth.identities'],{encoding:null})
  if(!Buffer.isBuffer(dump)||!dump.length)throw new Error('EMPTY_DATABASE_BACKUP')
  let storage=createClient(url,service,clientOptions).storage
  const inspect=async(bucket,name)=>{
   const response=await fetch(url+'/storage/v1/object/info/'+encodeURIComponent(bucket)+'/'+name.split('/').map(encodeURIComponent).join('/'),{headers:{apikey:service,authorization:`Bearer ${service}`},redirect:'error',signal:AbortSignal.timeout(15000)})
   if(!response.ok)throw new Error('STORAGE_METADATA_READ_FAILED')
   return response.json()
  }
  const captureOptions={inspect}
  const probe=await storage.from('telecom-documents').upload(wa+'/w5-recovery-metadata.pdf',Buffer.from('%PDF-1.4\n% synthetic W5 metadata\n%%EOF\n'),{contentType:'application/pdf',headers:{'cache-control':'no-cache'},metadata:{synthetic_reference:'w5-only',nested:{snake_case:'preserved'}},upsert:false})
  if(probe.error)throw new Error('STORAGE_METADATA_PROBE_FAILED')
  const contents=await captureStorage(storage,captureOptions)
  if(!contents.objects.length)throw new Error('STORAGE_RECOVERY_REQUIRES_OBJECTS')
  const manifest=recoveryManifest()
  const bundle={version:1,migrations:migrations(),recovery_manifest:manifest,database:dump.toString('base64'),database_sha256:hash(dump),...contents}
  verifyBundle(bundle)
  const encrypted=encryptBackup(Buffer.from(JSON.stringify(bundle)),key,'disposable-ephemeral')
  const archive=join(scratch,'synthetic.encrypted');writeFileSync(archive,encrypted,{mode:0o600})
  const recovered=JSON.parse(decryptBackup(readFileSync(archive),key));verifyBundle(recovered)
  report.recovery_configuration=verifyRecoveryManifest(recovered.recovery_manifest,manifest)
  if(JSON.stringify(recovered.migrations)!==JSON.stringify(manifest.migrations))throw new Error('RECOVERY_MIGRATION_INVENTORY_DRIFT')
  const rejects=(action,name)=>{let denied=false;try{action()}catch{denied=true}if(!denied)throw new Error('RECOVERY_NEGATIVE_CONTROL_FAILED');return {name,status:'PASS',provider_mutation_performed:false}}
  const corruption=Buffer.from(encrypted);corruption[corruption.length-10]^=1
  report.negative_recovery=[rejects(()=>decryptBackup(corruption,key),'CORRUPT_ARCHIVE_REJECTED'),rejects(()=>decryptBackup(encrypted,randomBytes(32)),'WRONG_KEY_REJECTED')]
  const malformed=JSON.parse(encrypted);malformed.tag=Buffer.from(malformed.tag,'base64').subarray(0,12).toString('base64')
  report.negative_recovery.push(rejects(()=>decryptBackup(Buffer.from(JSON.stringify(malformed)),key),'INCOMPLETE_ARCHIVE_FORMAT_REJECTED'))
  const noncanonical=JSON.parse(encrypted);noncanonical.body+='!'
  report.negative_recovery.push(rejects(()=>decryptBackup(Buffer.from(JSON.stringify(noncanonical)),key),'NONCANONICAL_ARCHIVE_FORMAT_REJECTED'))
  const ambiguous=structuredClone(recovered);ambiguous.buckets.push({...ambiguous.buckets[0]})
  report.negative_recovery.push(rejects(()=>verifyBundle(ambiguous),'AMBIGUOUS_BUCKET_INVENTORY_REJECTED'))
  for(const [name,mutation]of [['MISSING_OBJECT_BYTES_REJECTED',b=>b.objects[0].bytes=''],['PUBLIC_BUCKET_REJECTED',b=>b.buckets[0].public=true]]){const bad=structuredClone(recovered);mutation(bad);report.negative_recovery.push(rejects(()=>verifyBundle(bad),name))}
  const unknown=structuredClone(recovered.recovery_manifest);unknown.migrations.push({name:'20990101000000_unknown.sql'});report.negative_recovery.push(rejects(()=>verifyRecoveryManifest(unknown,manifest),'UNRECOGNIZED_MIGRATION_REJECTED'))
  report.backup={database:'PASS',storage_bytes:'PASS',encryption:'AES-256-GCM',archive_sha256:hash(encrypted),objects:contents.objects.length,auth_scope:'LOCAL_USERS_IDENTITIES_ONLY_NO_SESSIONS',offsite:'NOT_PROVEN'}
  // Explicitly discard Environment A before reconstructing B. No reused SQL schema.
  command('supabase',['stop','--no-backup','--project-id','crm-telecom-local'],{timeout:120000})
  report.recovery_stage='fresh_rebuild'
  command('supabase',['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor,mailpit'],{timeout:600000})
  // Clean B may have fresh local signing material. Never reuse A's service JWT
  // as a recovery credential; obtain B bindings privately from its CLI status.
  const statusB=JSON.parse(command('supabase',['status','--output','json']))
  if((statusB.API_URL??statusB.api?.url)!==url)throw new Error('RESTORE_TARGET_URL_MISMATCH')
  anon=statusB.ANON_KEY??statusB.auth?.anon_key
  service=statusB.SERVICE_ROLE_KEY??statusB.auth?.service_role_key
  if(!anon||!service)throw new Error('RESTORE_TARGET_KEYS_MISSING')
  storage=createClient(url,service,clientOptions).storage
  const fresh=metadata()
  if(JSON.stringify(fresh)!==JSON.stringify(expected))throw new Error('FRESH_SCHEMA_DRIFT')
  report.recovery_stage='restore_database'
  // Migrations may install technical/catalog rows. The complete A data dump
  // includes those rows, so clear B data while preserving the canonical schema.
  report.recovery_stage='clear_fresh_data'
  command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','supabase_admin','-d','postgres'],{input:`do $$ declare tables text; begin select string_agg(format('%I.%I',schemaname,tablename),',') into tables from pg_tables where schemaname='public'; execute 'truncate '||tables||',auth.users,auth.identities cascade'; end $$;`})
  // New schema is canonical; import data with triggers disabled only in this
  // disposable superuser DB. Roles, ACLs and schema are never imported without ACLs.
  report.recovery_stage='import_database'
  command('docker',['exec','-i',db,'pg_restore','-U','supabase_admin','-d','postgres','--data-only','--disable-triggers','--exit-on-error'],{input:Buffer.from(recovered.database,'base64')})
  if(JSON.stringify(rows())!==JSON.stringify(expectedRows))throw new Error('DATABASE_RECOVERY_ROW_MISMATCH')
  report.recovery_stage='restore_storage'
  report.restore_storage_readiness=await storageReady(url,service)
  let storageResult
  try{storageResult=await restoreStorage(storage,recovered,captureOptions)}catch(e){if(e.message==='STORAGE_RECOVERY_MISMATCH')report.storage_mismatch=e.summary;throw e}
  if(JSON.stringify(metadata())!==JSON.stringify(expected))throw new Error('RESTORE_SECURITY_DRIFT')
  report.recovery_stage='verify_auth_scope'
  // Actual user JWT checks after restore: retained business revocation and A/B scope.
  const api=async(path,token,body)=>{const r=await fetch(url+path,{method:body?'POST':'GET',headers:{apikey:anon,authorization:`Bearer ${token}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,json:await r.json()}}
  const authorization_checks=[]
  const denied_rpc_checks=[]
  const ticket=JSON.parse(sql(`select coalesce((select jsonb_build_object('id',t.id,'document_id',t.document_id) from public.document_download_tickets t join public.documents d on d.id=t.document_id and d.workspace_id=t.workspace_id where t.workspace_id='${wa}' and t.actor_id='${users.ownerA.id}' and t.expires_at<statement_timestamp() and d.status='active' order by t.id limit 1),'null'::jsonb);`))
  if(!ticket||!['id','document_id'].every(k=>/^[0-9a-f-]{36}$/.test(ticket[k])))throw new Error('RESTORED_EXPIRED_TICKET_FIXTURE_MISSING')
  const deny=async(name,r)=>{const proof=verifyRestoredRpcDenial(r);denied_rpc_checks.push({name,...proof})}
  for(const name of ['ownerA','ownerB','removedA','suspendedA','viewerA','adminA']){
   const user=users[name]
   const login=await api('/auth/v1/token?grant_type=password',anon,{email:user.email,password:user.password})
   if(login.status!==200||!login.json.access_token)throw new Error('RESTORED_AUTH_LOGIN_FAILED')
   // Test both fresh login and the actual JWT retained from before reconstruction.
   for(const [session,token]of [['FRESH_LOGIN',login.json.access_token],['RETAINED_JWT',user.token]]){
   if(typeof token!=='string'||!token)throw new Error('RESTORED_RETAINED_JWT_MISSING')
   const list=await api('/rest/v1/workspaces?select=id',token)
   if(list.status!==200||!Array.isArray(list.json))throw new Error('RESTORED_RLS_FAILED')
   if(['removedA','suspendedA'].includes(name)){
    const role=await api('/rest/v1/rpc/current_workspace_role',token,{p_workspace_id:wa})
    if(role.status!==200||role.json!==null||list.json.some(w=>w.id===wa))throw new Error('RESTORED_REVOCATION_FAILED')
   }else{
    const own=name==='ownerB'?wb:wa,foreign=name==='ownerB'?wa:wb
    if(!list.json.some(w=>w.id===own)||list.json.some(w=>w.id===foreign))throw new Error('RESTORED_TENANT_SCOPE_FAILED')
    const role=await api('/rest/v1/rpc/current_workspace_role',token,{p_workspace_id:own})
    if(role.status!==200||role.json!==(['viewerA','adminA'].includes(name)?'viewer':'owner'))throw new Error('RESTORED_CURRENT_ROLE_NOT_PROVEN')
   }
   const download=await fetch(url+'/storage/v1/object/authenticated/telecom-documents/'+object,{headers:{apikey:anon,authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)})
   const storage_response={status:download.status,json:download.status===200?null:await download.json()}
   const raw=await api('/rest/v1/assistant_operations?select=operation_ref',token)
   const proof=verifyRestoredPrivateResponses({owner:name==='ownerA',storage:storage_response,assistant:raw})
   authorization_checks.push({actor:name,session,status:'PASS',...proof})
   const rpc=(operation,input,workspace=wa)=>api('/rest/v1/rpc/'+operation,token,{p_workspace_id:workspace,p_input:input})
   if(['viewerA','adminA','removedA','suspendedA','ownerB'].includes(name)){
    await deny(name+'_'+session+'_WRITE',await rpc('product_v1_task_create',{command_id:randomUUID(),title:'Synthetic post-restore denied task'}))
    await deny(name+'_'+session+'_REVEAL',await rpc('sensitive_v1_get',{entity_kind:'customer',entity_id:randomUUID(),fields:['fiscal_id']}))
   }
   if(name==='ownerA'){
    await deny(session+'_EXPIRED_TICKET',await rpc('document_content_v1_manifest',{id:ticket.document_id,ticket_id:ticket.id}))
    await deny(session+'_FORGED_TICKET',await rpc('document_content_v1_manifest',{id:ticket.document_id,ticket_id:randomUUID()}))
    await deny(session+'_FOREIGN_REVEAL_SCOPE',await rpc('sensitive_v1_get',{entity_kind:'customer',entity_id:randomUUID(),fields:['fiscal_id']},wb))
   }
   }
  }
  return {result:'PASS',fresh_rebuilds:2,schema_drift:'PASS',database_hashes:'PASS',storage:storageResult,storage_metadata_scope:['size','sha256','content_type','cache_control','custom_metadata'],storage_provider_ids_timestamps:'REGENERATED_API_FIELDS',tenant_isolation:'PASS',revoked_member:'PASS',auth_login:'PASS',authorization_checks,denied_rpc_checks,stale_admin_role:'DISPOSABLE_DOWNGRADE_TO_VIEWER_PRESERVED',duration_seconds:Math.round((Date.now()-start)/1000),hosted_auth_portability:'NOT_PROVEN',offsite:'NOT_PROVEN'}
 }finally{
  key.fill(0)
  const target=resolve(scratch)
  if(!target.startsWith(resolve(tmpdir())+sep)||!basename(target).startsWith('crm-synthetic-recovery-'))throw new Error('SCRATCH_CLEANUP_GUARD')
  rmSync(target,{recursive:true,force:true})
 }
}
