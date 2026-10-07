import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto'
import {hash,loopback} from './lib.mjs'
const MAX_BYTES=128*1024*1024
export function encryptBackup(bytes,key,keyId){
 if(!Buffer.isBuffer(bytes)||bytes.length>MAX_BYTES||!Buffer.isBuffer(key)||key.length!==32||!/^[a-zA-Z0-9_-]{1,80}$/.test(keyId))throw new Error('BACKUP_INPUT_INVALID')
 const nonce=randomBytes(12),header=Buffer.from(JSON.stringify({version:1,key_id:keyId,algorithm:'AES-256-GCM'}))
 const cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(header)
 const body=Buffer.concat([cipher.update(bytes),cipher.final()])
 return Buffer.from(JSON.stringify({header:header.toString('base64'),nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:body.toString('base64')}))
}
export function decryptBackup(archive,key){
 try{
  if(archive.length>MAX_BYTES*2||key.length!==32)throw new Error()
  const a=JSON.parse(archive),header=Buffer.from(a.header,'base64'),h=JSON.parse(header)
  if(h.version!==1||h.algorithm!=='AES-256-GCM')throw new Error()
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(a.nonce,'base64'));decipher.setAAD(header);decipher.setAuthTag(Buffer.from(a.tag,'base64'))
  return Buffer.concat([decipher.update(Buffer.from(a.body,'base64')),decipher.final()])
 }catch{throw new Error('BACKUP_AUTHENTICATION_FAILED')}
}
export function verifyBundle(bundle){
 if(bundle.version!==1||!Array.isArray(bundle.objects)||!Array.isArray(bundle.buckets)||!Array.isArray(bundle.migrations))throw new Error('BACKUP_MANIFEST_INVALID')
 const db=Buffer.from(bundle.database??'','base64');if(!db.length||hash(db)!==bundle.database_sha256)throw new Error('DATABASE_HASH_MISMATCH')
 const seen=new Set()
 for(const bucket of bundle.buckets)if(typeof bucket.id!=='string'||bucket.public!==false)throw new Error('PUBLIC_OR_INVALID_BUCKET')
 for(const o of bundle.objects){
  if(typeof o.name!=='string'||!o.name.length||o.name.split('/').some(p=>['..','.',''].includes(p))||!bundle.buckets.some(b=>b.id===o.bucket)||seen.has(`${o.bucket}/${o.name}`))throw new Error('OBJECT_MANIFEST_INVALID')
  seen.add(`${o.bucket}/${o.name}`)
  const bytes=Buffer.from(o.bytes??'','base64');if(hash(bytes)!==o.sha256||bytes.length!==o.size)throw new Error('STORAGE_HASH_MISMATCH')
 }
 return true
}
export async function captureStorage(storage){
 const b=await storage.listBuckets();if(b.error||!Array.isArray(b.data))throw new Error('BUCKET_LIST_FAILED')
 const buckets=b.data.map(({id,name,public:pub,file_size_limit,allowed_mime_types})=>({id,name,public:pub,file_size_limit,allowed_mime_types}))
 if(buckets.some(b=>b.public!==false))throw new Error('PUBLIC_BUCKET_FORBIDDEN')
 const objects=[];let total=0
 for(const bucket of buckets){
  const queue=[''];let prefixes=0
  while(queue.length){
   if(++prefixes>10000)throw new Error('STORAGE_INVENTORY_TOO_LARGE')
   const prefix=queue.shift()
   for(let offset=0;;offset+=100){
    const list=await storage.from(bucket.id).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}})
    if(list.error||!Array.isArray(list.data))throw new Error('OBJECT_LIST_FAILED')
    for(const item of list.data){
     const name=prefix?`${prefix}/${item.name}`:item.name
     if(!item.id){queue.push(name);continue}
     if(objects.length>=10000)throw new Error('STORAGE_INVENTORY_TOO_LARGE')
     const download=await storage.from(bucket.id).download(name);if(download.error||!download.data)throw new Error('OBJECT_DOWNLOAD_FAILED')
     const bytes=Buffer.from(await download.data.arrayBuffer());total+=bytes.length;if(total>MAX_BYTES)throw new Error('BACKUP_SIZE_LIMIT')
     objects.push({bucket:bucket.id,name,size:bytes.length,sha256:hash(bytes),content_type:item.metadata?.mimetype??download.data.type??'application/octet-stream',cache_control:item.metadata?.cacheControl??'3600',bytes:bytes.toString('base64')})
    }
    if(list.data.length<100)break
   }
  }
 }
 return {buckets,objects:objects.sort((a,b)=>`${a.bucket}/${a.name}`.localeCompare(`${b.bucket}/${b.name}`))}
}
export async function restoreStorage(storage,bundle){
 verifyBundle(bundle)
 for(const b of bundle.buckets){
  const existing=await storage.getBucket(b.id)
  if(existing.error){
   const status=Number(existing.error.status??existing.error.statusCode)
   const absent=status===404||status===400&&/^Bucket not found$/i.test(existing.error.message??'')
   if(!absent)throw new Error(`BUCKET_TARGET_READ_FAILED_${Number.isInteger(status)?status:'UNKNOWN'}`)
   const r=await storage.createBucket(b.id,{public:false,fileSizeLimit:b.file_size_limit,allowedMimeTypes:b.allowed_mime_types});if(r.error)throw new Error(`BUCKET_RESTORE_FAILED_${Number(r.error.status??r.error.statusCode)||'UNKNOWN'}`)
  }
  else if(existing.data.public!==false||existing.data.file_size_limit!==b.file_size_limit||JSON.stringify(existing.data.allowed_mime_types)!==JSON.stringify(b.allowed_mime_types))throw new Error('BUCKET_CONFIG_DRIFT')
 }
 for(const o of bundle.objects){
  const r=await storage.from(o.bucket).upload(o.name,Buffer.from(o.bytes,'base64'),{contentType:o.content_type,cacheControl:String(o.cache_control).replace(/^max-age=/,''),upsert:false})
  if(r.error)throw new Error('OBJECT_RESTORE_FAILED')
 }
 const recovered=await captureStorage(storage)
 const summaries=objects=>objects.map(({bucket,name,size,sha256,content_type,cache_control})=>({bucket,name,size,sha256,content_type,cache_control}))
 if(JSON.stringify(summaries(recovered.objects))!==JSON.stringify(summaries(bundle.objects)))throw new Error('STORAGE_RECOVERY_MISMATCH')
 return {objects:recovered.objects.length,hashes:'PASS',metadata:'PASS'}
}
export function storageTargetGuard(url){if(url!=='http://127.0.0.1:54321'||!loopback(url))throw new Error('BACKUP_LOOPBACK_ONLY')}
