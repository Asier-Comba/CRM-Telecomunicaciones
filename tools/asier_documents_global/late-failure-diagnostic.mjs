export function lateFailureCategory(error){
 const message=typeof error?.message==='string'?error.message:''
 return /strict mode violation/.test(message)?'LOCATOR_AMBIGUOUS':error?.name==='TimeoutError'||/Timeout|Timed out/.test(message)?'BOUNDED_WAIT_FAILED':'OTHER_SAFE_FAILURE'
}
export function libraryDenialAlert(page){return page.getByRole('alert').filter({has:page.getByRole('button',{name:'Reintentar consulta',exact:true})})}
export async function closedLateFailure(page,error){
 const result={category:lateFailureCategory(error)}
 for(const [name,read]of Object.entries({
  total_alerts:()=>page.getByRole('alert').count(),
  library_denial_alerts:()=>page.getByRole('alert').filter({hasText:'No tienes permiso para esta acción.'}).count(),
  next_announcer_alerts:()=>page.locator('next-route-announcer').locator('[role="alert"]').count(),
  document_rows:()=>page.locator('[data-document-id]').count()
 }))try{const value=await read();result[name]=Number.isSafeInteger(value)&&value>=0?value:null}catch{result[name]=null}
 try{result.observer=await page.evaluate(()=>{const s=window.__crmGlobalLateObservation?.state;return{installed:!!s,json_consumed:s?.json_consumed===true,settled:s?.settled===true,saw_rows:s?.saw_rows===true}})}catch{result.observer=null}
 return result
}
