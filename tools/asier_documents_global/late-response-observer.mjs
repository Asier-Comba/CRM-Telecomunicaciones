import {expect} from '@playwright/test'

// Passive test-only instrumentation. Outbound requests and JSON values are
// unchanged. Observe the released successful library response's JSON delivery,
// then two render frames, retaining any transient row insertion in between.
export async function beginLateResponseObservation(page,path){
 await page.evaluate(endpoint=>{
  if(document.querySelector('[data-document-id]'))throw Error('LATE_OBSERVER_REQUIRES_WITHDRAWN_ROWS')
  if(window.__crmGlobalLateObservation)throw Error('LATE_OBSERVER_ALREADY_ACTIVE')
  const original=Response.prototype.json,state={json_consumed:false,settled:false,saw_rows:false}
  const observer=new MutationObserver(()=>{if(document.querySelector('[data-document-id]'))state.saw_rows=true})
  observer.observe(document.body,{childList:true,subtree:true})
  Response.prototype.json=function(...args){
   const watched=this.url===location.origin+endpoint&&this.status===200
   const result=Reflect.apply(original,this,args)
   if(!watched)return result
   return result.then(value=>{
    state.json_consumed=true
    queueMicrotask(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{state.settled=true})))
    return value
   })
  }
  window.__crmGlobalLateObservation={state,restore(){Response.prototype.json=original;observer.disconnect();delete window.__crmGlobalLateObservation}}
 },path)
}
export async function settledLateResponseObservation(page){
 await expect.poll(()=>page.evaluate(()=>window.__crmGlobalLateObservation?.state.settled===true)).toBe(true)
 return page.evaluate(()=>({...window.__crmGlobalLateObservation.state}))
}
export function cleanLateResponseObservation(state){return state?.json_consumed===true&&state.settled===true&&state.saw_rows===false}
export async function endLateResponseObservation(page){await page.evaluate(()=>window.__crmGlobalLateObservation?.restore())}
