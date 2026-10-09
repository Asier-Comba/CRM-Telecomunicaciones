export async function postgresQueryReady({expected,probe,pause=()=>new Promise(r=>setTimeout(r,500)),attempts=60}){
 if(!/^\d+\.\d+$/.test(expected??'')||typeof probe!=='function'||typeof pause!=='function'||!Number.isSafeInteger(attempts)||attempts<1||attempts>60)throw new Error('POSTGRES_READINESS_CONTRACT_INVALID')
 for(let attempt=1;attempt<=attempts;attempt++){
  let observed
  try{observed=await probe()}catch{
   if(attempt===attempts)throw new Error('ACTUAL_POSTGRES_QUERY_NOT_READY')
   await pause();continue
  }
  if(typeof observed!=='string'||!/^\d+\.\d+$/.test(observed)||observed!==expected)throw new Error('ACTUAL_POSTGRES_PINNED_VERSION_MISMATCH')
  return {version:observed,query_attempts:attempt}
 }
}
