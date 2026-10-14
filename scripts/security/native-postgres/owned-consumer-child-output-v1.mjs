const failure=()=>Error('OWNED_CONSUMER_CHILD_OUTPUT_UNAVAILABLE')

/** Drain only the caller's owned fixture process. Successful exit alone does
 * not establish complete output; no stderr/error payload is retained. */
export function collectOwnedConsumerChildOutputV1(child,onBoundedOutput=()=>{}){
 return new Promise((resolve,reject)=>{
  let settled=false,bytes=0,observedExit=null
  const output=[]
  const timer=setTimeout(()=>finish(false),300000)
  function finish(ok){
   if(settled)return
   settled=true;clearTimeout(timer)
   try{
    const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(output))
    // The private caller preserves only its existing closed phase classifier,
    // including failure paths. This callback never grants successful output.
    onBoundedOutput(text)
    if(ok){resolve(text);return}
   }catch{/* Closed unavailable output, never partial decoding or callback error payload. */}
   try{child.kill('SIGKILL')}catch{/* A failed kill request never becomes cleanup evidence. */}
   reject(failure())
  }
  child.stdout.on('data',chunk=>{
   if(settled)return
   bytes+=chunk.length
   if(bytes>1048576){finish(false);return}
   output.push(Buffer.from(chunk))
  })
  child.stderr.on('data',()=>{})
  child.stdout.on('error',()=>finish(false));child.stderr.on('error',()=>finish(false))
  child.once('error',()=>finish(false))
  child.once('exit',(code,signal)=>{observedExit={code,signal}})
  child.once('close',(code,signal)=>finish(code===0&&signal===null&&observedExit?.code===0&&observedExit.signal===null))
 })
}
