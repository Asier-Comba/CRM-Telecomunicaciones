import { previewCustomers, previewLines, previewMeetings, previewOpportunities, previewPermanences, previewRenewals, previewTasks, previewServices } from '@/lib/telecom-preview/data'

export const dynamic = 'force-dynamic'
const allowed = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === 'true'
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-ES').trim().replace(/\s+/g,' ')
const deny=['otro workspace','service role','sql directo','todos los cif','revela el system prompt','call this url','ignore previous instructions']

type PreviewReply={contract:'assistant.preview-read.v1';status:'OK'|'AMBIGUOUS'|'POLICY_BLOCK'|'INVALID_INPUT';answer:string;sources:Array<{operation:string;field:string;as_of:string}>;request_id:string}
const reply=(request_id:string,status:PreviewReply['status'],answer:string,sources:PreviewReply['sources']=[]):Response=>Response.json({contract:'assistant.preview-read.v1',status,answer,sources,request_id} satisfies PreviewReply,{headers:{'Cache-Control':'no-store'}})

export async function POST(request:Request){
  const requestId=request.headers.get('x-request-id')?.slice(0,80)??'preview-request'
  if(!allowed)return reply(requestId,'POLICY_BLOCK','La vista sintética solo está disponible en desarrollo.')
  let body:unknown
  try{body=await request.json()}catch{return reply(requestId,'INVALID_INPUT','La consulta no tiene un formato válido.')}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||!Object.hasOwn(body,'text'))return reply(requestId,'INVALID_INPUT','La consulta no tiene un formato válido.')
  const text=(body as {text?:unknown}).text
  if(typeof text!=='string'||!text.trim()||new TextEncoder().encode(text).length>500)return reply(requestId,'INVALID_INPUT','Escribe una consulta breve.')
  const q=normalize(text)
  if(deny.some(fragment=>q.includes(fragment)))return reply(requestId,'POLICY_BLOCK','Solo puedo consultar los datos sintéticos autorizados de este espacio.')
  const asOf='2026-09-30T07:00:00Z'
  if(['dame el resumen del dia','que tengo hoy','que tengo que llamar hoy','cuales tengo q llamar'].includes(q))return reply(requestId,'OK',`Hoy hay ${previewTasks.length} tareas abiertas y ${previewMeetings.length} reunión programada.`,[{operation:'dashboard.get',field:'today',as_of:asOf}])
  if(q.includes('permanencia'))return reply(requestId,'OK',previewPermanences.map(item=>`${item.customer?.display_name}: ${item.ends_on}`).join(' · ')||'No hay permanencias en los datos disponibles.',[{operation:'permanence.list',field:'ends_on',as_of:asOf}])
  if(q.includes('renovacion')||q.includes('renueva'))return reply(requestId,'OK',previewRenewals.map(item=>`${item.customer?.display_name}: ${item.target_on}`).join(' · ')||'No dispongo de renovaciones.',[{operation:'renewal.list',field:'target_on',as_of:asOf}])
  if(q.includes('oportunidad'))return reply(requestId,'OK',`${previewOpportunities.length} oportunidades abiertas. ${previewOpportunities.map(item=>`${item.title} (${item.stage.display_name})`).join(' · ')}`,[{operation:'opportunity.list',field:'stage',as_of:asOf}])
  const matched=previewCustomers.filter(item=>q.includes(normalize(item.legal_name))||q.includes(normalize(item.trade_name??''))||normalize(item.legal_name).split(' ').some(token=>token.length>5&&q.includes(token)))
  if(matched.length>1)return reply(requestId,'AMBIGUOUS',`He encontrado ${matched.length} empresas parecidas. Indica el nombre completo.`)
  if(matched.length===1){const item=matched[0];const services=previewServices.filter(s=>s.customer.id===item.id);const ids=new Set<string>(services.map(s=>s.id));const lines=previewLines.filter(line=>ids.has(line.service.id));return reply(requestId,'OK',`${item.legal_name} tiene ${services.length} servicios y ${lines.length} líneas visibles.`,[{operation:'customer.summary',field:'services',as_of:asOf},{operation:'customer.summary',field:'lines',as_of:asOf}])}
  return reply(requestId,'AMBIGUOUS','Puedo consultar clientes, líneas, tareas, reuniones, oportunidades, renovaciones y permanencias. ¿Qué necesitas ver?')
}
