import { isProductOperationV1 } from './product-runtime-v1.ts'
import { isClosedObjectV1 as plain } from './product-work-runtime-v1.ts'
import type { ProductServiceV1 } from './product-service-v1'
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
export function productReplyV1(data: unknown, status = 200) { return Response.json(data, { status, headers }) }
export const PRODUCT_HTTP_STATUS_V1 = { validation: 400, access_denied: 403, not_found: 404, conflict: 409, unavailable: 503, internal_safe: 500 } as const
export async function readProductEnvelopeV1(request:Request,maxBytes=12288):Promise<Response|{operation:string;input:unknown}> {
 try {
  if (request.method !== 'POST') return productReplyV1({ ok:false,error:'validation' },405)
  const configuredOrigin=process.env.PRODUCT_V1_ORIGIN
  if(process.env.NODE_ENV==='production'&&!configuredOrigin)return productReplyV1({ok:false,error:'unavailable'},503)
  const expectedOrigin=configuredOrigin??new URL(request.url).origin
  if(new URL(expectedOrigin).origin!==expectedOrigin)return productReplyV1({ok:false,error:'unavailable'},503)
  if (request.headers.get('origin') !== expectedOrigin || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) return productReplyV1({ok:false,error:'access_denied'},403)
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || ![null,'identity'].includes(request.headers.get('content-encoding'))) return productReplyV1({ok:false,error:'validation'},415)
  const length=request.headers.get('content-length')
  if (length!==null && (!/^\d+$/.test(length) || Number(length)>maxBytes)) return productReplyV1({ok:false,error:'validation'},413)
  if (request.body===null) return productReplyV1({ok:false,error:'validation'},400)
  const reader=request.body.getReader(); const chunks: Uint8Array[]=[];let size=0
  try { while(true) { const chunk=await reader.read(); if(chunk.done)break;size+=chunk.value.byteLength;if(size>maxBytes){await reader.cancel();return productReplyV1({ok:false,error:'validation'},413)} chunks.push(chunk.value) } } finally {reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  let value:unknown
  try {value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))} catch {return productReplyV1({ok:false,error:'validation'},400)}
  if(!plain(value) || Object.keys(value).sort().join(',')!=='input,operation' || typeof value.operation!=='string')return productReplyV1({ok:false,error:'validation'},400)
  return {operation:value.operation as string,input:value.input}
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
/** Streaming byte cap applies even when Content-Length is missing or false. */
export async function productHttpV1(request: Request, kind: 'commands' | 'queries', factory: () => Promise<{ commands: ProductServiceV1 } | null>) {
 try {
  const envelope=await readProductEnvelopeV1(request)
  if(envelope instanceof Response)return envelope
  const value=envelope
  const op=value.operation
  if(kind==='commands' ? !isProductOperationV1(op) : !['calendar.list','work.get','opportunity.stages','customer.editor','contact.editors','dashboard.get','global.search'].includes(op))return productReplyV1({ok:false,error:'validation'},400)
  const services=await factory();if(services===null)return productReplyV1({ok:false,error:'unavailable'},503)
  let result
  if(kind==='commands' && isProductOperationV1(op))result=await services.commands.execute(op,value.input)
  else if(op==='customer.editor' || op==='contact.editors') {
   if(!plain(value.input) || Object.keys(value.input).some(k=>!(op==='customer.editor'?['id']:['customer_id','limit','after_id']).includes(k)))return productReplyV1({ok:false,error:'validation'},400)
   const input=value.input
   result=op==='customer.editor'?await services.commands.customerEditor(input.id as string):await services.commands.contactEditors(input.customer_id as string,input.limit===undefined?20:input.limit as number,input.after_id===undefined?null:input.after_id as string|null)
  } else if(op==='calendar.list')result=await services.commands.calendar(value.input)
  else if(op==='dashboard.get')result=await services.commands.dashboard(value.input)
  else if(op==='global.search')result=await services.commands.globalSearch(value.input)
  else {
   if(!plain(value.input) || Object.keys(value.input).some(k=>!(op==='work.get'?['kind','id']:['limit','after_id']).includes(k)))return productReplyV1({ok:false,error:'validation'},400)
   result=op==='work.get'?await services.commands.workGet(value.input.kind as 'task'|'meeting'|'opportunity',value.input.id as string):await services.commands.stageCatalog(value.input.limit===undefined?50:value.input.limit as number,value.input.after_id===undefined?null:value.input.after_id as string|null)
  }
  return productReplyV1(result,result.ok?200:PRODUCT_HTTP_STATUS_V1[result.error])
 } catch {return productReplyV1({ok:false,error:'internal_safe'},500)}
}
