import {parsePortfolioGetInputV1,parsePortfolioGetV1} from '../../../src/lib/server/portfolio-runtime-v1.ts'

/** Read only a closed lifecycle marker from the same committed document. */
export async function currentPortfolioGateStage(page,destination){
 try{
  const stage=await page.evaluate(expected=>{
   if(location.href!==expected)return'document_changed'
   const gate=document.querySelector('[data-crm-access-stage]')
   if(!gate)return'not_present'
   const value=gate.getAttribute('data-crm-access-stage')
   return['before_effect','legacy_checking','user_pending','user_returned','client_unavailable','access_error'].includes(value)?value:'unavailable'
  },destination)
  return['before_effect','legacy_checking','user_pending','user_returned','client_unavailable','access_error','not_present','document_changed'].includes(stage)?stage:'unavailable'
 }catch{return'unavailable'}
}

/** Only current main-document user-read headers; no identity or authorization claim. */
function observeAccess({page,authOrigin,destination,report,phase}){
 if(!authOrigin)return{navigationDone(){},finish(){}}
 let parsed;try{parsed=new URL(authOrigin)}catch{throw Error('PORTFOLIO_AUTH_ORIGIN_INVALID')}
 if(parsed.origin!==authOrigin||parsed.protocol!=='http:'||parsed.hostname!=='127.0.0.1'||parsed.username||parsed.password)throw Error('PORTFOLIO_AUTH_ORIGIN_INVALID')
 const main=page.mainFrame(),reads=new Map();let documentObserved=false,navigationDone=false,truncated=false
 const navigated=frame=>{if(frame===main&&frame.url()===destination)documentObserved=true}
 const started=request=>{
  try{
   if(!documentObserved||request.frame()!==main||request.method()!=='GET'||request.url()!==authOrigin+'/auth/v1/user')return
   if(reads.size>=32){truncated=true;return}
   reads.set(request,{status:null,failed:false})
  }catch{/* Service-worker and detached frames do not provide this evidence. */}
 }
 const responded=response=>{
  const read=reads.get(response.request());if(!read)return
  const status=response.status();read.status=status===200?'ok':status===401||status===403?'denied':status>=400&&status<500?'client_error':status>=500&&status<600?'server_error':'other'
 }
 const failed=request=>{const read=reads.get(request);if(read)read.failed=true}
 page.on('framenavigated',navigated);page.on('request',started);page.on('response',responded);page.on('requestfailed',failed)
 return{
  navigationDone(){navigationDone=true},
  async finish(){
   page.off('framenavigated',navigated);page.off('request',started);page.off('response',responded);page.off('requestfailed',failed)
   if(!report)return
   const gate_stage=documentObserved?await currentPortfolioGateStage(page,destination):'unavailable'
   const values=[...reads.values()],width=phase.match(/^layout:portfolio:(1440|768|390):exact_reference$/)?.[1]
   const status_counts=Object.fromEntries(['ok','denied','client_error','server_error','other'].map(status=>[status,values.filter(v=>v.status===status).length]))
   report.w2_portfolio_access_observations??=[]
   if(report.w2_portfolio_access_observations.length<6)report.w2_portfolio_access_observations.push({scope:'CURRENT_MAIN_DOCUMENT_AUTH_USER_HEADERS_NOT_AUTHORIZATION',width:width?Number(width):null,document_observed:documentObserved,navigation_completed:navigationDone,gate_stage,requests:values.length,responses:values.filter(v=>v.status!==null).length,failures:values.filter(v=>v.failed).length,pending:values.filter(v=>v.status===null&&!v.failed).length,status_counts,truncated})
  },
 }
}

/** Correlate the current navigation's ordinary read before asserting rendering. */
export async function currentPortfolioReference({page,origin,kind,id,report,authOrigin}){
 const input=parsePortfolioGetInputV1({kind,id})
 if(!input)throw Error('PORTFOLIO_REFERENCE_INPUT_INVALID')
 const phase=report?.w2_ui_action_step??'portfolio_reference'
 const step=name=>{if(report)report.w2_ui_action_step=phase+':'+name}
 step('fresh_document');await page.goto('about:blank')
 const destination=origin+'/portfolio?kind='+input.kind+'&id='+input.id
 const observation=observeAccess({page,authOrigin,destination,report,phase})
 try{
 step('current_request')
 const pending=page.waitForRequest(request=>{
  if(request.method()!=='POST'||request.url()!==origin+'/api/portfolio/v1/queries')return false
  try{const body=request.postDataJSON();return Object.keys(body).sort().join(',')==='input,operation'&&body.operation==='portfolio.get'&&Object.keys(body.input).sort().join(',')==='id,kind'&&body.input.kind===input.kind&&body.input.id===input.id}catch{return false}
 })
 const [,request]=await Promise.all([page.goto(destination).then(()=>observation.navigationDone()),pending])
 step('current_response');const response=await request.response()
 if(!response||response.status()!==200)throw Error('PORTFOLIO_REFERENCE_HTTP_REFUSED')
 step('current_body');let body;try{body=await response.json()}catch{throw Error('PORTFOLIO_REFERENCE_BODY_UNAVAILABLE')}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='data,ok'||body.ok!==true)throw Error('PORTFOLIO_REFERENCE_ENVELOPE_INVALID')
 const value=parsePortfolioGetV1(input,body.data)
 if(!value)throw Error('PORTFOLIO_REFERENCE_CURRENT_DTO_INVALID')
 step('current_render');return value
 }finally{await observation.finish()}
}
