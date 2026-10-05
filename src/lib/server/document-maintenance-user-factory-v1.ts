import 'server-only'
import {createUserServerClient}from './supabase-user'
import {createProductUserPortV1}from './product-user-factory-v1'
import {DocumentMaintenanceServiceV1}from './document-maintenance-service-v1'
import {isUuidV1}from './product-work-runtime-v1'
export async function createDocumentMaintenanceUserServiceV1(){
 const client=await createUserServerClient(),port=await createProductUserPortV1();if(!client||!port)return null
 return new DocumentMaintenanceServiceV1({...port,
  actor:async()=>{const r=await client.auth.getUser();return r.error?null:r.data.user?.id??null},
  witnessKey:()=>{const id=process.env.PRODUCT_DOCUMENT_VERIFY_KEY_ID,key=process.env.PRODUCT_DOCUMENT_VERIFY_KEY_HEX;return isUuidV1(id)&&typeof key==='string'&&/^[0-9a-f]{64}$/i.test(key)?{key_id:id.toLowerCase(),key:Buffer.from(key,'hex')}:null},
  upload:async()=> 'denied',
  download:async path=>{const r=await client.storage.from('telecom-documents').download(path);return r.error||!r.data||r.data.size>10485760?null:new Uint8Array(await r.data.arrayBuffer())},
  remove:async path=>{const r=await client.storage.from('telecom-documents').remove([path]);return !r.error},
 },process.env.PRODUCT_DOCUMENT_SCAN_REQUIRED==='true')
}
