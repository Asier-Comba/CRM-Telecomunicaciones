import 'server-only'
import {createUserServerClient}from './supabase-user'
import {createProductUserPortV1}from './product-user-factory-v1'
import {DocumentContentServiceV1}from './document-content-service-v1'
export async function createDocumentContentUserServiceV1(){
 const client=await createUserServerClient(),port=await createProductUserPortV1();if(!client||!port)return null
 return new DocumentContentServiceV1({...port,
  upload:async(path,bytes,mime)=>{const r=await client.storage.from('telecom-documents').upload(path,bytes,{contentType:mime,upsert:false});if(!r.error)return'ok';const code=String('statusCode'in r.error?r.error.statusCode:'');return['409','400'].includes(code)&&/already exists|duplicate/i.test(r.error.message)?'exists':code==='403'?'denied':'failed'},
  download:async path=>{const r=await client.storage.from('telecom-documents').download(path);if(r.error||!r.data||r.data.size>10485760)return null;return new Uint8Array(await r.data.arrayBuffer())},
 })
}
