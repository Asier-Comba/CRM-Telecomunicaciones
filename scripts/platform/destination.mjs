import {hash} from './lib.mjs'
export async function copyEncryptedArchive(archive,adapter){
 // Provider-neutral put/get interface. Credentials stay within the adapter.
 let parsed
 try{
  parsed=JSON.parse(archive)
  const header=JSON.parse(Buffer.from(parsed.header,'base64'))
  if(header.version!==1||header.algorithm!=='AES-256-GCM'||!/^[A-Za-z0-9_-]{1,80}$/.test(header.key_id)||Buffer.from(parsed.nonce,'base64').length!==12||Buffer.from(parsed.tag,'base64').length!==16||!Buffer.from(parsed.body,'base64').length)throw new Error()
 }catch{throw new Error('ENCRYPTED_ARCHIVE_REQUIRED')}
 const digest=hash(archive),name=`backup-${digest}.encrypted`
 await adapter.put(name,archive,{sha256:digest,created_at:new Date().toISOString()})
 const retrieved=await adapter.get(name)
 if(!Buffer.isBuffer(retrieved)||hash(retrieved)!==digest)throw new Error('DESTINATION_HASH_MISMATCH')
 return {status:'PASS',sha256:digest,offsite_proven:false}
}
export function retentionPlan(items,days,now=Date.now()){
 if(!Number.isSafeInteger(days)||days<1)throw new Error('APPROVED_RETENTION_REQUIRED')
 const expired=[]
 for(const item of items){if(!/^backup-[0-9a-f]{64}\.encrypted$/.test(item.name)||!Number.isFinite(Date.parse(item.created_at)))throw new Error('INVALID_RETENTION_INVENTORY');if(now-Date.parse(item.created_at)>days*86400000)expired.push(item.name)}
 return {mode:'PLAN_ONLY',days,expired,deletion_performed:false}
}
