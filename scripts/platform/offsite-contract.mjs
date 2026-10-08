import {hash} from './lib.mjs'
import {decryptBackup} from './backup.mjs'
const fail=code=>{throw new Error(code)}
export async function exerciseOffsite({archive,key,policy,adapter,now=Date.now()}){
 // No selected real provider exists. This contract only exercises injected mocks.
 if(adapter?.scope!=='DISPOSABLE_SIMULATION')fail('REAL_OFFSITE_NOT_AUTHORIZED')
 if(!policy||policy.approval!=='COMPANY_APPROVED'||!Number.isSafeInteger(policy.retention_days)||policy.retention_days<1||!['VERSIONING','IMMUTABILITY'].includes(policy.protection)||!policy.source_account||!policy.backup_account||policy.source_account===policy.backup_account||!policy.bucket||!policy.region)fail('OFFSITE_POLICY_REQUIRED')
 const identity=await adapter.identity()
 if(identity?.account!==policy.backup_account||identity?.bucket!==policy.bucket||identity?.region!==policy.region||identity?.permissions?.write!==true||identity?.permissions?.read!==true||identity?.permissions?.delete!==false)fail('OFFSITE_IDENTITY_MISMATCH')
 decryptBackup(archive,key)
 const digest=hash(archive),name=`backup-${digest}.encrypted`,retainUntil=now+policy.retention_days*86400000
 const receipt=await adapter.put(name,archive,{sha256:digest,retain_until:retainUntil,protection:policy.protection,create_only:true})
 if(typeof receipt?.version!=='string'||!receipt.version||receipt.protection!==policy.protection||receipt.retain_until<retainUntil)fail('OFFSITE_PROTECTION_NOT_PROVEN')
 const returned=await adapter.get(name,receipt.version)
 if(!Buffer.isBuffer(returned)||hash(returned)!==digest)fail('OFFSITE_READBACK_MISMATCH')
 decryptBackup(returned,key)
 return {status:'SIMULATED_PASS',archive_sha256:digest,readback:'SIMULATED_PASS',decryption:'SIMULATED_PASS',retention_days:policy.retention_days,protection:policy.protection,offsite_proven:false,provider_values_included:false}
}
export async function rotateArchive({archive,oldKey,newKey,newKeyId,encrypt}){
 if(!Buffer.isBuffer(newKey)||newKey.length!==32||newKey.equals(oldKey)||typeof encrypt!=='function')fail('DISTINCT_ROTATION_KEY_REQUIRED')
 const clear=decryptBackup(archive,oldKey)
 try{const rotated=encrypt(clear,newKey,newKeyId);if(hash(decryptBackup(rotated,newKey))!==hash(clear))fail('ROTATION_READBACK_FAILED');return rotated}finally{clear.fill(0)}
}
