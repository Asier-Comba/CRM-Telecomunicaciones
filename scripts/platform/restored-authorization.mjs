// Classify actual authenticated responses; unavailable services prove nothing.
// Response bodies stay in memory and are never returned as audit evidence.
export function verifyRestoredPrivateResponses({owner,storage,assistant}){
 if(typeof owner!=='boolean')throw new Error('RESTORED_ACTOR_INVALID')
 if(owner){
  if(storage?.status!==200)throw new Error('RESTORED_STORAGE_OWNER_NOT_PROVEN')
 }else{
  const denied=[400,404].includes(storage?.status)&&storage?.json?.message==='Object not found'
  if(!denied)throw new Error('RESTORED_STORAGE_DENIAL_NOT_PROVEN')
 }
 if(assistant?.status!==403||assistant?.json?.code!=='42501')throw new Error('RESTORED_ASSISTANT_DENIAL_NOT_PROVEN')
 return {storage:owner?'AUTHORIZED':'DENIED',assistant_raw:'DENIED',response_values_included:false}
}
