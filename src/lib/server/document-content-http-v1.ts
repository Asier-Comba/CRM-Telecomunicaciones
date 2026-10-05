import {readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1}from './product-http-v1.ts'
import {isDocumentContentOperationV1}from './document-content-runtime-v1.ts'
import type {DocumentContentServiceV1}from './document-content-service-v1'
export async function documentContentHttpV1(request:Request,kind:'commands'|'upload'|'download',factory:()=>Promise<DocumentContentServiceV1|null>,origin:string|undefined){
 try{
  if(kind!=='upload'){
   const e=await readProductEnvelopeV1(request,4096,origin);if(e instanceof Response)return e
   if(kind==='commands'){
    if(!isDocumentContentOperationV1(e.operation))return productReplyV1({ok:false,error:'validation'},400)
    const s=await factory();if(!s)return productReplyV1({ok:false,error:'unavailable'},503);const r=await s.execute(e.operation,e.input);return productReplyV1(r,r.ok?200:PRODUCT_HTTP_STATUS_V1[r.error])
   }
   if(e.operation!=='document.download'||e.input===null||typeof e.input!=='object'||Array.isArray(e.input)||Object.keys(e.input).sort().join(',')!=='id,ticket_id')return productReplyV1({ok:false,error:'validation'},400)
   const input=e.input as {id:string;ticket_id:string},s=await factory();if(!s)return productReplyV1({ok:false,error:'unavailable'},503)
   const r=await s.download(input.id,input.ticket_id);if(!r.ok)return productReplyV1(r,PRODUCT_HTTP_STATUS_V1[r.error])
   return new Response(new Uint8Array(r.bytes),{headers:{'Cache-Control':'no-store','Content-Type':r.mime,'Content-Disposition':'attachment; filename="document.'+(r.mime==='application/pdf'?'pdf':r.mime==='image/png'?'png':'jpg')+'"','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}})
  }
  if(request.method!=='POST')return productReplyV1({ok:false,error:'validation'},405)
  let canonical:URL;try{canonical=new URL(origin??'');if(canonical.origin!==origin||!['https:','http:'].includes(canonical.protocol)||canonical.username||canonical.password)throw Error()}catch{return productReplyV1({ok:false,error:'unavailable'},503)}
  if(request.headers.get('host')!==canonical.host||request.headers.get('origin')!==origin||request.headers.has('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin')return productReplyV1({ok:false,error:'access_denied'},403)
  const mime=request.headers.get('content-type');if(!['application/pdf','image/png','image/jpeg'].includes(mime??'')||![null,'identity'].includes(request.headers.get('content-encoding')))return productReplyV1({ok:false,error:'validation'},415)
  const query=new URL(request.url).searchParams;if([...query.keys()].join(',')!=='id')return productReplyV1({ok:false,error:'validation'},400)
  const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>10485760))return productReplyV1({ok:false,error:'validation'},413)
  if(!request.body)return productReplyV1({ok:false,error:'validation'},400)
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0
  try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>10485760){await reader.cancel();return productReplyV1({ok:false,error:'validation'},413)}chunks.push(r.value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength}
  const s=await factory();if(!s)return productReplyV1({ok:false,error:'unavailable'},503);const r=await s.upload(query.get('id')??'',bytes,mime!);return productReplyV1(r,r.ok?200:PRODUCT_HTTP_STATUS_V1[r.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
