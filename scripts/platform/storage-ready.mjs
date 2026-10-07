import {storageTargetGuard} from './backup.mjs'
// Rebuilding a service on the same socket address can invalidate pooled HTTP
// connections. Recheck a read-only endpoint after B/import, before any upload.
export async function storageReady(url,service,{transport=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),attempts=30}={}){
 storageTargetGuard(url)
 for(let attempt=0;attempt<attempts;attempt++){
  let response
  try{response=await transport(url+'/storage/v1/bucket',{headers:{apikey:service,authorization:`Bearer ${service}`},redirect:'error',signal:AbortSignal.timeout(3000)})}catch{}
  if(response?.ok){await response.arrayBuffer();return {result:'PASS',attempts:attempt+1}}
  if(response&&![502,503,504].includes(response.status))throw new Error(`RESTORE_STORAGE_READINESS_HTTP_${response.status}`)
  if(response)await response.arrayBuffer()
  await pause(500)
 }
 throw new Error('RESTORE_STORAGE_READINESS_TIMEOUT')
}
