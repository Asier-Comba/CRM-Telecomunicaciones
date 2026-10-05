import {createCipheriv,createDecipheriv,createHmac,hkdfSync,randomBytes,randomUUID}from 'node:crypto'
import {constants}from 'node:fs'
import {link,lstat,mkdir,open,realpath,unlink}from 'node:fs/promises'
import {isAbsolute,join}from 'node:path'
export type ImportWorkerScopeV1=Readonly<{workspaceId:string;actorId:string;role:'owner'|'admin'}>
export type ImportWorkerPortV1=Readonly<{resolve:()=>Promise<ImportWorkerScopeV1|null>;job:(workspaceId:string,id:string)=>Promise<{id:string;status:string}|null>}>
export type ImportWorkerGrantV1=Readonly<{workspaceId:string;actorId:string;jobId:string;purpose:'stage'|'process'|'cleanup'}>
export type ImportStagingRefV1=Readonly<{object_id:string;size_bytes:number;digest_hmac:string;key_version:1;expires_at:string}>
export interface EncryptedImportStagingV1{
 health():Readonly<{provider:string;production_ready:boolean;encryption:'AES-256-GCM'}>
 authorize(jobId:string,purpose:ImportWorkerGrantV1['purpose']):Promise<ImportWorkerGrantV1>
 put(grant:ImportWorkerGrantV1,bytes:Uint8Array,objectId?:string):Promise<ImportStagingRefV1>
 get(grant:ImportWorkerGrantV1,ref:ImportStagingRefV1):Promise<Uint8Array>
 delete(grant:ImportWorkerGrantV1,ref:ImportStagingRefV1):Promise<void>
}
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const max=2*1024*1024,active=new Set(['uploaded','mapping','validating','ready']),terminal=new Set(['completed','failed','cancelled'])
const deny=()=>{throw new Error('IMPORT_STAGING_ACCESS_DENIED')}
const invalid=()=>{throw new Error('IMPORT_STAGING_INVALID')}
export async function createDisposableImportStagingV1(root:string,port:ImportWorkerPortV1,env:Readonly<Record<string,string|undefined>>=process.env):Promise<EncryptedImportStagingV1>{
 // This adapter is available only in a disposable Node test process. A caller cannot override a production process.
 if(process.env.NODE_ENV==='production'||env.NODE_ENV!=='test'||env.IMPORT_STAGING_ADAPTER!=='disposable-local'||!/^[0-9a-f]{64}$/i.test(env.IMPORT_STAGING_TEST_KEY??''))throw new Error('IMPORT_STAGING_NOT_CONFIGURED')
 if(!isAbsolute(root)||(await realpath(root))!==root)invalid()
 const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)invalid()
 const key=Buffer.from(env.IMPORT_STAGING_TEST_KEY!,'hex'),leases=new WeakMap<object,number>()
 const current=async(g:ImportWorkerGrantV1,purposes:ImportWorkerGrantV1['purpose'][])=>{
  if(!leases.has(g)||Date.now()-leases.get(g)!>30000||!purposes.includes(g.purpose))deny()
  const s=await port.resolve();if(!s||s.workspaceId!==g.workspaceId||s.actorId!==g.actorId||!['owner','admin'].includes(s.role))deny()
  const j=await port.job(g.workspaceId,g.jobId);if(!j||j.id!==g.jobId||!(g.purpose==='cleanup'?terminal:active).has(j.status))deny()
 }
 const derive=(g:ImportWorkerGrantV1,purpose:string)=>Buffer.from(hkdfSync('sha256',key,Buffer.from(g.workspaceId+':'+g.jobId),Buffer.from('crm.import-staging.v1:'+purpose),32))
 const path=async(g:ImportWorkerGrantV1,id:string)=>{
  if(!uuid(id))invalid();let dir=root
  for(const component of [g.workspaceId,g.jobId]){dir=join(dir,component);await mkdir(dir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e});const st=await lstat(dir);if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)invalid()}
  return join(dir,id+'.aead')
 }
 const checkRef=(r:ImportStagingRefV1)=>{if(Object.keys(r).sort().join(',')!=='digest_hmac,expires_at,key_version,object_id,size_bytes'||!uuid(r.object_id)||r.key_version!==1||!Number.isSafeInteger(r.size_bytes)||r.size_bytes<1||r.size_bytes>max||!/^[0-9a-f]{64}$/.test(r.digest_hmac)||!Number.isFinite(Date.parse(r.expires_at)))invalid()}
 const mac=(g:ImportWorkerGrantV1,b:Uint8Array)=>createHmac('sha256',derive(g,'digest')).update(b).digest('hex')
 const aad=(g:ImportWorkerGrantV1,id:string)=>Buffer.from('crm.import-staging.v1:'+g.workspaceId+':'+g.jobId+':'+id)
 const read=async(g:ImportWorkerGrantV1,id:string)=>{
  const file=await open(await path(g,id),constants.O_RDONLY|constants.O_NOFOLLOW)
  try{const st=await file.stat();if(!st.isFile()||st.size<30||st.size>max+29||(st.mode&0o077)!==0)invalid();const b=await file.readFile();if(b[0]!==1)invalid();const d=createDecipheriv('aes-256-gcm',derive(g,'encryption'),b.subarray(1,13));d.setAAD(aad(g,id));d.setAuthTag(b.subarray(13,29));return Buffer.concat([d.update(b.subarray(29)),d.final()])}finally{await file.close()}
 }
 return{
  health:()=>({provider:'disposable-local',production_ready:false,encryption:'AES-256-GCM'}),
  authorize:async(jobId,purpose)=>{
   if(!uuid(jobId)||!['stage','process','cleanup'].includes(purpose))invalid();const s=await port.resolve()
   if(!s||!uuid(s.workspaceId)||!uuid(s.actorId)||!['owner','admin'].includes(s.role))deny()
   const j=await port.job(s!.workspaceId,jobId);if(!j||j.id!==jobId||!(purpose==='cleanup'?terminal:active).has(j.status))deny()
   const g=Object.freeze({workspaceId:s!.workspaceId,actorId:s!.actorId,jobId,purpose});leases.set(g,Date.now());return g
  },
  put:async(g,bytes,objectId=randomUUID())=>{
   await current(g,['stage']);if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>max||!uuid(objectId))invalid()
   const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',derive(g,'encryption'),nonce);c.setAAD(aad(g,objectId));const enc=Buffer.concat([c.update(bytes),c.final()])
   const filePath=await path(g,objectId)
   const temporary=filePath+'.'+randomUUID()+'.tmp'
   try{const f=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await f.writeFile(Buffer.concat([Buffer.from([1]),nonce,c.getAuthTag(),enc]));await f.sync()}finally{await f.close()}
    try{await link(temporary,filePath)}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const existing=await read(g,objectId);if(mac(g,existing)!==mac(g,bytes))throw new Error('IMPORT_STAGING_CONFLICT')}
   }finally{await unlink(temporary).catch(()=>{})}
   // Recheck after I/O. Expiry is derived from durable mtime, so retries return the same reference.
   await current(g,['stage']);const st=await lstat(filePath)
   return{object_id:objectId,size_bytes:bytes.length,digest_hmac:mac(g,bytes),key_version:1,expires_at:new Date(st.mtimeMs+24*3600*1000).toISOString()}
  },
  get:async(g,r)=>{
   await current(g,['stage','process']);checkRef(r);if(Date.parse(r.expires_at)<=Date.now())deny()
   try{const st=await lstat(await path(g,r.object_id));if(new Date(st.mtimeMs+24*3600*1000).toISOString()!==r.expires_at)invalid();const bytes=await read(g,r.object_id);if(bytes.length!==r.size_bytes||mac(g,bytes)!==r.digest_hmac)invalid();await current(g,['stage','process']);return bytes}catch{throw new Error('IMPORT_STAGING_UNAVAILABLE')}
  },
  delete:async(g,r)=>{
   await current(g,['cleanup']);checkRef(r);const p=await path(g,r.object_id)
   try{const bytes=await read(g,r.object_id);if(bytes.length!==r.size_bytes||mac(g,bytes)!==r.digest_hmac)invalid();await current(g,['cleanup']);await unlink(p)}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('IMPORT_STAGING_UNAVAILABLE')}
  },
 }
}
export interface ProductionImportStagingProviderV1{readonly id:string;readonly keyReference:string;readonly scope:'workspace_job';create(port:ImportWorkerPortV1):Promise<EncryptedImportStagingV1>}
// No registered production provider. Environment values alone never establish availability.
export function importProcessingReadinessV1(){return{production_ready:false as const,status:'blocked_registered_kms_scoped_worker_and_domain_adapters' as const,formats:['csv'] as const,xlsx:'unregistered' as const,zip:'blocked' as const}}
