import {createClient} from '@supabase/supabase-js'
import {randomBytes} from 'node:crypto'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join,resolve,sep,basename} from 'node:path'
import {tmpdir} from 'node:os'
import {encryptBackup,decryptBackup,captureStorage,restoreStorage,verifyBundle,storageTargetGuard} from './backup.mjs'
import {disposableGuard,root,migrations,hash} from './lib.mjs'
import {checkRpcManifest} from './rpc-manifest.mjs'
import {storageReady} from './storage-ready.mjs'
const clientOptions={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,options={})=>fetch(input,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}}
// Called only inside run-stack after real Auth/Storage acceptance. It never takes
// a caller-selected database, Docker container, URL or key from CLI arguments.
export async function recoveryRehearsal({url,anon,service,db,command,report,users,wa,wb,object}){
 disposableGuard();storageTargetGuard(url)
 if(!/^supabase_db_crm-telecom-local$/.test(db))throw new Error('RECOVERY_DB_TARGET_REJECTED')
 const start=Date.now(),key=randomBytes(32),scratch=mkdtempSync(join(tmpdir(),'crm-synthetic-recovery-'))
 const sql=s=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:s})
 const metadata=()=>({privileges:JSON.parse(sql(readFileSync(join(root,'scripts/security/native-postgres/privilege-snapshot.sql'),'utf8'))),schema:JSON.parse(sql(readFileSync(join(root,'scripts/platform/drift.sql'),'utf8')))})
 const rows=()=>JSON.parse(sql(`select jsonb_object_agg(name,digest) from (select n.nspname||'.'||c.relname name, (xpath('/row/h/text()',query_to_xml(format('select md5(coalesce(string_agg(t::text,chr(10) order by t::text),'''')) h from %I.%I t',n.nspname,c.relname),false,true,'')))[1]::text digest from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or n.nspname='auth' and c.relname in ('users','identities')) and c.relkind='r') x;`))
 try{
  report.recovery_stage='capture'
  const expected=metadata(),expectedRows=rows()
  report.rpc_manifest=checkRpcManifest(expected.privileges)
  if(JSON.stringify(expected.schema.migrations)!==JSON.stringify(migrations().map(m=>m.version)))throw new Error('MIGRATION_VERSION_DRIFT')
  // Obtain DB bytes without terminal conversion or echoing any contents.
  const dump=command('docker',['exec',db,'pg_dump','-U','postgres','-d','postgres','--format=custom','--data-only','--table=public.*','--table=auth.users','--table=auth.identities'],{encoding:null})
  if(!Buffer.isBuffer(dump)||!dump.length)throw new Error('EMPTY_DATABASE_BACKUP')
  let storage=createClient(url,service,clientOptions).storage
  const contents=await captureStorage(storage)
  if(!contents.objects.length)throw new Error('STORAGE_RECOVERY_REQUIRES_OBJECTS')
  const bundle={version:1,migrations:migrations(),database:dump.toString('base64'),database_sha256:hash(dump),...contents}
  verifyBundle(bundle)
  const encrypted=encryptBackup(Buffer.from(JSON.stringify(bundle)),key,'disposable-ephemeral')
  const archive=join(scratch,'synthetic.encrypted');writeFileSync(archive,encrypted,{mode:0o600})
  const recovered=JSON.parse(decryptBackup(readFileSync(archive),key));verifyBundle(recovered)
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
  const storageResult=await restoreStorage(storage,recovered)
  if(JSON.stringify(metadata())!==JSON.stringify(expected))throw new Error('RESTORE_SECURITY_DRIFT')
  report.recovery_stage='verify_auth_scope'
  // Actual user JWT checks after restore: retained business revocation and A/B scope.
  const api=async(path,token,body)=>{const r=await fetch(url+path,{method:body?'POST':'GET',headers:{apikey:anon,authorization:`Bearer ${token}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,json:await r.json()}}
  for(const name of ['ownerA','ownerB','removedA','suspendedA']){
   const user=users[name]
   const login=await api('/auth/v1/token?grant_type=password',anon,{email:user.email,password:user.password})
   if(login.status!==200||!login.json.access_token)throw new Error('RESTORED_AUTH_LOGIN_FAILED')
   const token=login.json.access_token,list=await api('/rest/v1/workspaces?select=id',token)
   if(list.status!==200||!Array.isArray(list.json))throw new Error('RESTORED_RLS_FAILED')
   if(['removedA','suspendedA'].includes(name)){
    const role=await api('/rest/v1/rpc/current_workspace_role',token,{p_workspace_id:wa})
    if(role.status!==200||role.json!==null||list.json.some(w=>w.id===wa))throw new Error('RESTORED_REVOCATION_FAILED')
   }else{
    const own=name==='ownerA'?wa:wb,foreign=name==='ownerA'?wb:wa
    if(!list.json.some(w=>w.id===own)||list.json.some(w=>w.id===foreign))throw new Error('RESTORED_TENANT_SCOPE_FAILED')
   }
   const download=await fetch(url+'/storage/v1/object/authenticated/telecom-documents/'+object,{headers:{apikey:anon,authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)})
   if(name==='ownerA'?!download.ok:download.ok)throw new Error('RESTORED_STORAGE_AUTHORIZATION_FAILED')
   const raw=await api('/rest/v1/assistant_operations?select=id',token)
   if(raw.status<400&&(!Array.isArray(raw.json)||raw.json.length))throw new Error('RESTORED_ASSISTANT_RAW_ACCESS')
  }
  return {result:'PASS',fresh_rebuilds:2,schema_drift:'PASS',database_hashes:'PASS',storage:storageResult,tenant_isolation:'PASS',revoked_member:'PASS',auth_login:'PASS',duration_seconds:Math.round((Date.now()-start)/1000),hosted_auth_portability:'NOT_PROVEN',offsite:'NOT_PROVEN'}
 }finally{
  key.fill(0)
  const target=resolve(scratch)
  if(!target.startsWith(resolve(tmpdir())+sep)||!basename(target).startsWith('crm-synthetic-recovery-'))throw new Error('SCRATCH_CLEANUP_GUARD')
  rmSync(target,{recursive:true,force:true})
 }
}
