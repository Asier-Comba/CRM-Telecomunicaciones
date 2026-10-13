import {parseHistoryDataV2} from '../../../src/features/assistant/history-client-v2.ts'

/** Observe the new document's ordinary read before the unchanged render check. */
export async function currentHistoryReload({page,origin,thread,step=()=>{}}){
 const url=page.url(),input={limit:20}
 let target
 try{target=new URL(url)}catch{throw Error('HISTORY_RELOAD_TARGET_INVALID')}
 if(target.origin!==origin||target.pathname!=='/assistant'||target.username||target.password)throw Error('HISTORY_RELOAD_TARGET_INVALID')
 if(!thread||!parseHistoryDataV2('thread.get',{id:thread.id},{contract:'assistant.thread.v2',record:thread})||thread.archived)throw Error('HISTORY_RELOAD_THREAD_INVALID')
 let current=false
 const requests=new WeakSet()
 const navigated=frame=>{if(frame===page.mainFrame())current=frame.url()===url}
 const requested=request=>{
  if(!current||request.frame()!==page.mainFrame()||request.method()!=='POST'||request.url()!==origin+'/api/assistant/v2/threads')return
  try{
   const body=request.postDataJSON()
   if(Object.keys(body).sort().join(',')==='input,operation'&&body.operation==='thread.list'&&Object.keys(body.input).join(',')==='limit'&&body.input.limit===20)requests.add(request)
  }catch{}
 }
 page.on('framenavigated',navigated);page.on('request',requested)
 try{
  step('HISTORY_RELOAD_NAVIGATION')
  const pending=page.waitForResponse(response=>current&&page.url()===url&&requests.has(response.request()))
  const [,response]=await Promise.all([page.reload(),pending])
  step('HISTORY_RELOAD_CURRENT_RESPONSE')
  if(response.status()!==200)throw Error('HISTORY_RELOAD_HTTP_REFUSED')
  step('HISTORY_RELOAD_CURRENT_BODY')
  let body;try{body=await response.json()}catch{throw Error('HISTORY_RELOAD_BODY_UNAVAILABLE')}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='data,ok'||body.ok!==true)throw Error('HISTORY_RELOAD_ENVELOPE_INVALID')
  const value=parseHistoryDataV2('thread.list',input,body.data)
  if(!value)throw Error('HISTORY_RELOAD_CURRENT_DTO_INVALID')
  if(!value.items.some(row=>row.id===thread.id&&row.title===thread.title&&row.version===thread.version&&!row.archived))throw Error('HISTORY_RELOAD_CURRENT_THREAD_MISSING')
  step('HISTORY_RELOAD_CURRENT_RENDER')
  return value
 }finally{page.off('framenavigated',navigated);page.off('request',requested)}
}
