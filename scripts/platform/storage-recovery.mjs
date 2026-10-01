import { randomBytes,randomUUID,createHash } from 'node:crypto'
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const hash=x=>createHash('sha256').update(x).digest('hex'), identity=x=>`${x.bucket}:${x.path}`
export function reconcile(expected,objects,metadata) {
 const errors=new Set(),seen=new Set(),os=new Map(),ms=new Map()
 for(const x of objects){if(os.has(identity(x)))errors.add('DUPLICATE_OBJECT');os.set(identity(x),x)}
 for(const x of metadata){if(ms.has(identity(x)))errors.add('DUPLICATE_METADATA');ms.set(identity(x),x)}
 for(const x of expected){const key=identity(x);if(seen.has(key))errors.add('DUPLICATE_MANIFEST');seen.add(key)
  const o=os.get(key),m=ms.get(key)
  if(!o)errors.add('MISSING_OBJECT')
  if(!m)errors.add('MISSING_METADATA')
  if(o && (o.sha256!==x.sha256 || o.size!==x.size || o.contentType!==x.contentType))errors.add('OBJECT_INTEGRITY')
  if(m && ['documentId','workspaceId','customerId','status','sha256','size','contentType'].some(k=>m[k]!==x[k]))errors.add('METADATA_BINDING')
  if(!x.path.startsWith(`${x.workspaceId}/documents/${x.documentId}/`) || x.bucket!=='telecom-documents')errors.add('PATH_BINDING')
 }
 for(const key of os.keys())if(!ms.has(key)||!seen.has(key))errors.add('ORPHAN_OBJECT')
 for(const key of ms.keys())if(!seen.has(key))errors.add('UNEXPECTED_METADATA')
 return [...errors].sort()
}
export async function storageRecovery({url,anon,service,db,command}) {
 let checks=0
 const check=(ok,name)=>{if(!ok)throw new Error(`RECOVERY_${name}`);checks++}
 if(url!=='http://127.0.0.1:54321')throw new Error('RECOVERY_LOOPBACK_ONLY')
 async function http(path,token=service,method='GET',body,mime) {
  const r=await fetch(url+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:token===service?service:anon,authorization:`Bearer ${token}`,...(body!==undefined?{'content-type':mime||'application/json'}:{})},body:body===undefined?undefined:mime?body:JSON.stringify(body)})
  const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes.toString())}catch{}return {status:r.status,bytes,json,contentType:r.headers.get('content-type')?.split(';')[0]}
 }
 const sql=source=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:source})
 const wa=randomUUID(),wb=randomUUID(),ca=randomUUID(),cb=randomUUID(),users={}
 for(const [name,workspace] of [['ownerA',wa],['ownerB',wb],['revokedA',wa]]){
  const email=`restore-${name.toLowerCase()}-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url')+'aA1!'
  const created=await http('/auth/v1/admin/users',service,'POST',{email,password,email_confirm:true});check(created.status===200 && !!created.json?.id,'AUTH_CREATE')
  const login=await http('/auth/v1/token?grant_type=password',anon,'POST',{email,password});check(login.status===200&&!!login.json?.access_token,'AUTH_LOGIN');users[name]={id:created.json.id,token:login.json.access_token,workspace}
 }
 sql(`insert into public.workspaces(id,name,slug) values('${wa}','Recovery synthetic A','restore-a'),('${wb}','Recovery synthetic B','restore-b');
 insert into public.workspace_members(workspace_id,user_id,role,status) values ${Object.values(users).map(u=>`('${u.workspace}','${u.id}','owner','active')`).join(',')};
 insert into public.customers(id,workspace_id,account_kind,legal_name,lifecycle,status,source) values('${ca}','${wa}','legal_entity','Recovery synthetic A','customer','active','manual'),('${cb}','${wb}','legal_entity','Recovery synthetic B','customer','active','manual');`)
 const manifest=[],backup=mkdtempSync(join(tmpdir(),'w4-object-export-'))
 const objectUrl=x=>`/storage/v1/object/authenticated/${x.bucket}/${x.path}`
 try {
  for(const [workspaceId,customerId,status] of [[wa,ca,'active'],[wb,cb,'active'],[wa,ca,'archived']]){
   const documentId=randomUUID(),path=`${workspaceId}/documents/${documentId}/${randomUUID()}`,bytes=Buffer.from('Harmless synthetic recovery bytes '+randomUUID())
   const x={version:1,bucket:'telecom-documents',path,documentId,workspaceId,customerId,status,size:bytes.length,contentType:'application/pdf',sha256:hash(bytes),backedUpAt:new Date().toISOString()}
   check((await http(`/storage/v1/object/${x.bucket}/${path}`,service,'POST',bytes,x.contentType)).status===200,'CREATE_OBJECT')
   sql(`insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,sha256_hex,storage_path,status,archived_at) values('${documentId}','${workspaceId}','${customerId}','general','synthetic.txt','${x.contentType}',${x.size},'${x.sha256}','${path}','${status}',${status==='archived'?'now()':'null'});`)
   const exported=await http(objectUrl(x));check(exported.status===200&&hash(exported.bytes)===x.sha256,'EXPORT_HASH');writeFileSync(join(backup,documentId),exported.bytes,{mode:0o600});manifest.push(x)
  }
  writeFileSync(join(backup,'manifest.json'),JSON.stringify(manifest),{mode:0o600})
  const activeA=manifest[0],activeB=manifest[1],archived=manifest[2]
  check((await http(objectUrl(activeA),users.ownerA.token)).status===200,'BEFORE_AUTHORIZED')
  check((await http(objectUrl(activeA),users.ownerB.token)).status>=400,'BEFORE_FOREIGN_DENIED')
  sql(`delete from public.workspace_members where user_id='${users.revokedA.id}';`)
  check((await http('/auth/v1/user',users.revokedA.token)).status===200,'REVOKED_JWT_STILL_VALID')
  // Recreate only this disposable synthetic object namespace; no DB restore claim.
  check((await http('/storage/v1/object/telecom-documents',service,'DELETE',{prefixes:manifest.map(x=>x.path)})).status===200,'REMOVE_SYNTHETIC_SOURCE')
  for(const x of manifest)check((await http(objectUrl(x))).status>=400,'EMPTY_OBJECT_STATE')
  const fromDisk=JSON.parse(readFileSync(join(backup,'manifest.json'))),restored=[]
  for(const x of fromDisk){const bytes=readFileSync(join(backup,x.documentId));check(hash(bytes)===x.sha256,'BACKUP_COPY_HASH');check((await http(`/storage/v1/object/${x.bucket}/${x.path}`,service,'POST',bytes,x.contentType)).status===200,'RESTORE_OBJECT');const r=await http(objectUrl(x));check(r.status===200,'RESTORED_READ');restored.push({bucket:x.bucket,path:x.path,size:r.bytes.length,contentType:r.contentType,sha256:hash(r.bytes)})}
  const metadata=JSON.parse(sql(`select json_agg(json_build_object('documentId',id,'workspaceId',workspace_id,'customerId',customer_id,'status',status,'bucket',storage_bucket,'path',storage_path,'size',size_bytes,'contentType',media_type,'sha256',sha256_hex)) from public.documents where id in (${manifest.map(x=>`'${x.documentId}'`).join(',')});`))
  check(reconcile(manifest,restored,metadata).length===0,'RECONCILIATION')
  // Actual catalog detects extra/missing objects; hash checks use downloaded bytes.
  const catalog=JSON.parse(sql("select coalesce(json_agg(json_build_object('bucket',bucket_id,'path',name)), '[]'::json) from storage.objects where bucket_id='telecom-documents';"))
  check(catalog.length===manifest.length&&catalog.every(o=>manifest.some(x=>identity(x)===identity(o))),'NO_ORPHANS_OR_MISSING')
  check((await http(objectUrl(activeA),users.ownerA.token)).status===200,'RESTORED_A_ALLOWED')
  check((await http(objectUrl(activeB),users.ownerB.token)).status===200,'RESTORED_B_ALLOWED')
  for(const [x,token]of [[activeA,users.ownerB.token],[activeB,users.ownerA.token],[activeA,anon],[activeA,users.revokedA.token],[archived,users.ownerA.token]])check((await http(objectUrl(x),token)).status>=400,'RESTORED_UNAUTHORIZED_DENIED')
  const bucket=await http('/storage/v1/bucket/telecom-documents');check(bucket.status===200&&bucket.json?.public===false,'BUCKET_STILL_PRIVATE')
  return {RESULT:'PASS',OBJECTS_CREATED:manifest.length,OBJECTS_EXPORTED:manifest.length,OBJECTS_RESTORED:restored.length,HASH_MATCH:true,METADATA_MATCH:true,ORPHANS:0,MISSING:0,A_B:'PASS',REVOKED:'PASS',ARCHIVED:'PASS',checks,scope:'LOCAL_SYNTHETIC_RECREATED_OBJECT_NAMESPACE',database_restore:'NOT_PERFORMED',offsite_backup:'NOT_TESTED',production_encryption:'NOT_TESTED',quarantine_retention:'HUMAN_POLICY_REQUIRED'}
 } finally {rmSync(backup,{recursive:true,force:true})}
}
