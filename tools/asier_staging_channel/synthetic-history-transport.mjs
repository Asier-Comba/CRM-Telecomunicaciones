import {syntheticGitBatchDecoderV1,pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'

// Inactive real transport. This fixture controller cannot request pinned real
// history, does not choose an executable/repository, and never invokes Git.
// No real issuer or production registry exists. Even a fixture lease, JSON
// receipt, approval flag or caller callback cannot cross this boundary.
export const producePinnedHistoryTransferV1=async capability=>({result:capability===undefined?'NOT_RUN':'BLOCKED',error:capability===undefined?null:'REAL_HISTORY_ISSUER_NOT_CONFIGURED',real_history_authorized:false,publishing_authorized:false,security_accepted:false})

export async function collectSyntheticHistoryTransportV1({mode,ids,startSyntheticChild,milliseconds=30000,terminationMilliseconds=1000}={}){
 const report={result:'NOT_RUN',error:null,process_cleanup:'NOT_STARTED',exit_observed:false,stdout_end:false,close_observed:false,publishing_authorized:false,security_accepted:false}
 if(mode!=='SYNTHETIC_ONLY')return report
 if(!Array.isArray(ids)||ids.some(id=>pinnedHistoryObjectIdsV1.includes(id))||typeof startSyntheticChild!=='function'||!Number.isSafeInteger(milliseconds)||milliseconds<1||milliseconds>30000||!Number.isSafeInteger(terminationMilliseconds)||terminationMilliseconds<1||terminationMilliseconds>5000)return{...report,result:'BLOCKED',error:'SYNTHETIC_TRANSPORT_INVALID'}
 let decoder
 try{decoder=syntheticGitBatchDecoderV1(ids,{milliseconds})}catch{return{...report,result:'BLOCKED',error:'SYNTHETIC_TRANSPORT_INVALID'}}
 return await new Promise(resolve=>{
  let child,finished=false,stopping=false,failure=null,deadline,escalation,abandon,exitCode,exitSignal,inputFinished=false
  const request=Buffer.from(ids.join('\n')+'\n','ascii')
  function finish(){
   if(finished)return;finished=true
   clearTimeout(deadline);clearTimeout(escalation);clearTimeout(abandon);request.fill(0)
   let objects
   if(!failure&&report.exit_observed&&report.stdout_end&&report.close_observed&&inputFinished){
    try{objects=decoder.finish()}catch{failure='SYNTHETIC_TRANSPORT_PROTOCOL'}
   }else if(!failure)failure='SYNTHETIC_TRANSPORT_PROTOCOL'
   if(failure){decoder.abort();report.result='BLOCKED';report.error=failure}
   else{
    report.result='SYNTHETIC_ONLY_PASS';let available=true
    Object.defineProperties(report,{
     takeObjects:{value:()=>{if(!available)throw Error('SYNTHETIC_TRANSPORT_TERMINAL');available=false;return objects}},
     dispose:{value:()=>{if(available){available=false;for(const row of objects)row.bytes.fill(0)}}}
    })
   }
   report.process_cleanup=!child?'NOT_CREATED':report.close_observed?'PASS':'UNKNOWN'
   resolve(report)
  }
  function stop(code){
   if(finished)return
   if(!failure)failure=code
   if(!child){finish();return}
   if(report.close_observed){finish();return}
   if(stopping)return;stopping=true
   try{child.kill('SIGTERM')}catch{}
   if(finished)return
   escalation=setTimeout(()=>{try{child.kill('SIGKILL')}catch{};abandon=setTimeout(finish,terminationMilliseconds)},terminationMilliseconds)
  }
  deadline=setTimeout(()=>stop('SYNTHETIC_TRANSPORT_TIMEOUT'),milliseconds)
  try{
   child=startSyntheticChild()
   if(!child||typeof child.on!=='function'||typeof child.kill!=='function'||!child.stdout||!child.stdin||!child.stderr)throw Error('invalid fixture process')
   child.stdout.on('data',bytes=>{
    try{if(!finished&&!failure)decoder.feed(bytes)}catch{stop('SYNTHETIC_TRANSPORT_OUTPUT')}
    finally{if(Buffer.isBuffer(bytes))bytes.fill(0)}
   })
   child.stdout.on('end',()=>{if(!finished)report.stdout_end=true})
   child.stdout.on('error',()=>stop('SYNTHETIC_TRANSPORT_IO'))
   child.stderr.on('data',bytes=>{if(Buffer.isBuffer(bytes))bytes.fill(0)})
   child.stderr.on('error',()=>stop('SYNTHETIC_TRANSPORT_IO'))
   child.stdin.on('error',()=>stop('SYNTHETIC_TRANSPORT_IO'))
   child.stdin.on('finish',()=>{if(!finished)inputFinished=true})
   child.on('error',()=>stop('SYNTHETIC_TRANSPORT_PROCESS'))
   child.on('exit',(code,signal)=>{
    if(finished)return
    if(report.exit_observed){stop('SYNTHETIC_TRANSPORT_PROTOCOL');return}
    report.exit_observed=true;exitCode=code;exitSignal=signal
    if(code!==0||signal)stop('SYNTHETIC_TRANSPORT_PROCESS')
   })
   child.on('close',(code,signal)=>{
    if(finished)return
    report.close_observed=true
    if(code!==0||signal||exitCode!==code||exitSignal!==signal)failure??='SYNTHETIC_TRANSPORT_PROCESS'
    finish()
   })
   child.stdin.end(request)
  }catch{stop('SYNTHETIC_TRANSPORT_PROCESS')}
 })
}
