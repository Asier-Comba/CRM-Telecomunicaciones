const operations=new Set(['document.verify_content','document.cleanup_finish'])
const steps=new Set(['request_body','other_continue','lost_response_fetch','commit_status','intentional_abort','exact_retry_continue'])

function kind(error,step){
 let message=''
 try{
  const descriptor=error&&Object.getOwnPropertyDescriptor(error,'message')
  if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='string')message=descriptor.value
 }catch{/* Exotic errors stay unclassified; no getters, stacks or causes. */}
 return step==='commit_status'&&['INTEGRITY_UI_NOT_COMMITTED','CLEANUP_UI_NOT_COMMITTED'].includes(message)?'HTTP_REFUSED':'ACTION_FAILED'
}

/** Observe the original handler step only; preserve its action and exception. */
export async function observeDocumentMaintenanceStep(report,operation,step,action){
 if(!operations.has(operation)||!steps.has(step)||typeof action!=='function')throw Error('DOCUMENT_STEP_CONTEXT_INVALID')
 try{return await action()}
 catch(error){
  if(report){
   report.w2_document_maintenance_step_failures??=[]
   const rows=report.w2_document_maintenance_step_failures
   if(rows.length<2&&!rows.some(row=>row.operation===operation))rows.push({operation,step,kind:kind(error,step)})
  }
  throw error
 }
}
