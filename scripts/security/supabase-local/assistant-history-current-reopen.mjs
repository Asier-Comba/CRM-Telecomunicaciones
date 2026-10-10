import {parseHistoryDataV2} from '../../../src/features/assistant/history-client-v2.ts'

/** Observe the click's ordinary reads alongside the original render assertion.
 * No additional request, retry, timeout override or inferred persistence. */
export async function currentHistoryReopen({page,origin,thread,action,step=()=>{}}){
 const url=page.url(),main=page.mainFrame()
 let target;try{target=new URL(url)}catch{throw Error('HISTORY_REOPEN_TARGET_INVALID')}
 if(target.origin!==origin||target.pathname!=='/assistant'||target.username||target.password)throw Error('HISTORY_REOPEN_TARGET_INVALID')
 if(!thread||!parseHistoryDataV2('thread.get',{id:thread.id},{contract:'assistant.thread.v2',record:thread})||thread.archived)throw Error('HISTORY_REOPEN_THREAD_INVALID')
 if(typeof action!=='function')throw Error('HISTORY_REOPEN_ACTION_REQUIRED')
 const specs=[['thread.list',{limit:20}],['thread.get',{id:thread.id}],['message.page',{id:thread.id,limit:20}]]
 const requests=new WeakMap();let issued=0,validated=0,current=true,closed=false,outcome=null,chain=Promise.resolve()
 const navigated=frame=>{if(frame===main)current=false}
 const requested=request=>{
  if(!current||closed||issued===specs.length||page.url()!==url)return
  try{
   if(request.frame()!==main||request.method()!=='POST'||request.url()!==origin+'/api/assistant/v2/threads')return
   const body=request.postDataJSON(),[operation,input]=specs[issued]
   if(Object.keys(body).sort().join(',')!=='input,operation'||body.operation!==operation||Object.keys(body.input).sort().join(',')!==Object.keys(input).sort().join(',')||!Object.keys(input).every(key=>body.input[key]===input[key]))return
   requests.set(request,{index:issued,operation,input});issued++
  }catch{/* An unrelated or unavailable request supplies no evidence. */}
 }
 page.on('framenavigated',navigated);page.on('request',requested)
 const inspect=response=>{
  const spec=requests.get(response.request())
  if(!spec||!current||closed||page.url()!==url)return false
  const checked=chain.then(async()=>{
   if(outcome||closed||!current||page.url()!==url)return false
   const phase=spec.index===0?'LIST':spec.index===1?'GET':'MESSAGES';step('HISTORY_REOPEN_'+phase+'_CURRENT_RESPONSE')
   const fail=code=>{outcome={code:'HISTORY_REOPEN_'+phase+'_'+code};step(outcome.code);return true}
   if(spec.index!==validated)return fail('RESPONSE_ORDER_INVALID')
   if(response.status()!==200)return fail('HTTP_REFUSED')
   let body;try{body=await response.json()}catch{return fail('BODY_UNAVAILABLE')}
   if(closed||!current||page.url()!==url)return false
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='data,ok'||body.ok!==true)return fail('ENVELOPE_INVALID')
   const value=parseHistoryDataV2(spec.operation,spec.input,body.data)
   if(!value)return fail('DTO_INVALID')
   if(spec.index<2){
    const record=spec.index===0?value.items.find(row=>row.id===thread.id):value.record
    if(!record||record.id!==thread.id||record.title!==thread.title||record.version<thread.version||record.archived)return fail('CURRENT_THREAD_MISSING')
   }
   validated++
   if(validated!==specs.length)return false
   outcome={code:null};step('HISTORY_REOPEN_CURRENT_RENDER');return true
  }).catch(()=>{if(closed||!current||outcome)return false;outcome={code:'HISTORY_REOPEN_RESPONSE_UNAVAILABLE'};step(outcome.code);return true})
  chain=checked;return checked
 }
 try{
  step('HISTORY_REOPEN_CLICK')
  const pending=page.waitForResponse(inspect).then(()=>{if(outcome?.code)throw Error(outcome.code)})
  // Keep the exact original click + message-count assertion and its budget.
  // Promise.all observes both rejections, including late waiter disposal.
  await Promise.all([pending,Promise.resolve().then(action)])
  if(validated!==specs.length||outcome?.code!==null)throw Error('HISTORY_REOPEN_CURRENT_READS_INCOMPLETE')
 }finally{closed=true;page.off('framenavigated',navigated);page.off('request',requested)}
}
