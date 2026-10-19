import 'server-only'
import {createUserServerClient}from './supabase-user'
import {createProductUserPortV1}from './product-user-factory-v1'
import {DocumentContentServiceV1}from './document-content-service-v1'
import {createDocumentObjectFetchV1}from './document-object-fetch-v1'
export async function createDocumentContentUserServiceV1(){
 const client=await createUserServerClient(),port=await createProductUserPortV1(),fetchObject=createDocumentObjectFetchV1();if(!client||!port||!fetchObject)return null
 return new DocumentContentServiceV1({...port,
  upload:async(path,bytes,mime)=>{const r=await client.storage.from('telecom-documents').upload(path,bytes,{contentType:mime,upsert:false});if(!r.error)return'ok';const code=String('statusCode'in r.error?r.error.statusCode:'');return['409','400'].includes(code)&&/already exists|duplicate/i.test(r.error.message)?'exists':code==='403'?'denied':'failed'},
  // Bytes only after the manifest RPC admitted this user; see document-object-fetch-v1.
  download:fetchObject,
 })
}
