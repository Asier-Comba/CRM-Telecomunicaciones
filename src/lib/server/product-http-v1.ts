import { isProductOperationV1 } from './product-runtime-v1.ts'
import { isClosedObjectV1 as plain } from './product-work-runtime-v1.ts'
import type { ProductServiceV1 } from './product-service-v1'
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }
function reply(data: unknown, status = 200) { return Response.json(data, { status, headers }) }
const statuses = { validation: 400, access_denied: 403, not_found: 404, conflict: 409, unavailable: 503, internal_safe: 500 } as const
/** Streaming byte cap applies even when Content-Length is missing or false. */
export async function productHttpV1(request: Request, kind: 'commands' | 'queries', factory: () => Promise<{ commands: ProductServiceV1 } | null>) {
 try {
  if (request.method !== 'POST') return reply({ ok:false,error:'validation' },405)
  if (request.headers.get('origin') !== new URL(request.url).origin || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) return reply({ok:false,error:'access_denied'},403)
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || ![null,'identity'].includes(request.headers.get('content-encoding'))) return reply({ok:false,error:'validation'},415)
  const length=request.headers.get('content-length')
  if (length!==null && (!/^\d+$/.test(length) || Number(length)>12288)) return reply({ok:false,error:'validation'},413)
  if (request.body===null) return reply({ok:false,error:'validation'},400)
  const reader=request.body.getReader(); const chunks: Uint8Array[]=[];let size=0
  try { while(true) { const chunk=await reader.read(); if(chunk.done)break;size+=chunk.value.byteLength;if(size>12288){await reader.cancel();return reply({ok:false,error:'validation'},413)} chunks.push(chunk.value) } } finally {reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  let value:unknown
  try {value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))} catch {return reply({ok:false,error:'validation'},400)}
  if(!plain(value) || Object.keys(value).sort().join(',')!=='input,operation' || typeof value.operation!=='string')return reply({ok:false,error:'validation'},400)
  const op=value.operation
  if(kind==='commands' ? !isProductOperationV1(op) : !['calendar.list','work.get','opportunity.stages','customer.editor','contact.editors','dashboard.get','global.search'].includes(op))return reply({ok:false,error:'validation'},400)
  const services=await factory();if(services===null)return reply({ok:false,error:'unavailable'},503)
  let result
  if(kind==='commands' && isProductOperationV1(op))result=await services.commands.execute(op,value.input)
  else if(op==='customer.editor' || op==='contact.editors') {
   if(!plain(value.input) || Object.keys(value.input).some(k=>!(op==='customer.editor'?['id']:['customer_id','limit','after_id']).includes(k)))return reply({ok:false,error:'validation'},400)
   const input=value.input
   result=op==='customer.editor'?await services.commands.customerEditor(input.id as string):await services.commands.contactEditors(input.customer_id as string,input.limit===undefined?20:input.limit as number,input.after_id===undefined?null:input.after_id as string|null)
  } else if(op==='calendar.list')result=await services.commands.calendar(value.input)
  else if(op==='dashboard.get')result=await services.commands.dashboard(value.input)
  else if(op==='global.search')result=await services.commands.globalSearch(value.input)
  else {
   if(!plain(value.input) || Object.keys(value.input).some(k=>!(op==='work.get'?['kind','id']:['limit','after_id']).includes(k)))return reply({ok:false,error:'validation'},400)
   result=op==='work.get'?await services.commands.workGet(value.input.kind as 'task'|'meeting'|'opportunity',value.input.id as string):await services.commands.stageCatalog(value.input.limit===undefined?50:value.input.limit as number,value.input.after_id===undefined?null:value.input.after_id as string|null)
  }
  return reply(result,result.ok?200:statuses[result.error])
 } catch {return reply({ok:false,error:'internal_safe'},500)}
}
