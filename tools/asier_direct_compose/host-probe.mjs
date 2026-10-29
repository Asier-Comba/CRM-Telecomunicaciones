import {connect,isIP} from 'node:net'
import {fileURLToPath} from 'node:url'
export function probeHostCanary({host,port,mode,timeout=1500}){
 if(isIP(host)!==4||!Number.isInteger(port)||port<1||port>65535||!['positive','negative'].includes(mode)||!Number.isInteger(timeout)||timeout<1)throw Error('PROBE_INPUT_INVALID')
 return new Promise(resolve=>{
 const socket=connect({host,port});let connected=false,done=false,data=''
 const finish=(status,reason)=>{if(done)return;done=true;socket.destroy();resolve({status,connected,reason})}
 socket.setTimeout(timeout)
 socket.once('connect',()=>{connected=true;if(mode==='negative')finish('CONNECTED','TCP_ESTABLISHED')})
 socket.on('data',chunk=>{data+=chunk;if(data.length>128)finish('PROBE_ERROR','RESPONSE_TOO_LONG');else if(data==='CRM_DIRECT_OWNED_HOST_CANARY')finish('OPEN','IDENTIFIED')})
 socket.once('end',()=>finish('PROBE_ERROR','UNIDENTIFIED_RESPONSE'))
 socket.once('timeout',()=>finish(connected?'PROBE_ERROR':'DENIED',connected?'CONNECTED_TIMEOUT':'NO_CONNECTION_TIMEOUT'))
 socket.once('error',error=>finish(!connected&&['ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','ETIMEDOUT'].includes(error.code)?'DENIED':'PROBE_ERROR',!connected&&['ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','ETIMEDOUT'].includes(error.code)?error.code:'SOCKET_ERROR'))
 })
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const result=await probeHostCanary({host:process.argv[2],port:Number(process.argv[3]),mode:process.argv[4]});console.log(JSON.stringify(result));if(result.status==='PROBE_ERROR')process.exitCode=1}catch{console.log(JSON.stringify({status:'PROBE_ERROR',connected:false,reason:'INPUT_INVALID'}));process.exitCode=1}
}
