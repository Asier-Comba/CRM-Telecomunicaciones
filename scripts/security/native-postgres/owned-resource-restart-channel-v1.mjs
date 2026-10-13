import {randomBytes} from 'node:crypto'
const failure=()=>Error('OWNED_RESOURCE_RESTART_CHANNEL_UNAVAILABLE')
const phases=new Set(['COMMITTED_BEFORE_RESTART','RESTART_OWNER_ACK','LEDGER_AFTER_RESTART_MATCHED','EXPIRED_ORIGINAL_REPLAY_DENIED','FRESH_AUTHORISED_REPLAY_MATCHED'])
/** Diagnostics only: reject payload-bearing rows and return one fixed enum. */
export function closedOwnedConsumerPhaseV1(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>1048576)return null
 let phase=null
 for(const line of text.split(/\r?\n/)){try{const row=JSON.parse(line)
  if(row&&Object.keys(row).sort().join(',')==='kind,phase'&&row.kind==='durable_v3_owned_resource_consumer_phase'&&phases.has(row.phase))phase=row.phase
 }catch{/* Never export original bytes. */}}
 return phase
}
const packet=(value,kind,request)=>!!value&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).sort().join(',')==='kind,request'&&value.kind===kind
 &&typeof value.request==='string'&&/^[a-f0-9]{32}$/.test(value.request)&&(!request||value.request===request)

/** One private IPC request to the parent owning W5's existing resource handle.
 * No target, connection, SQL, row, credentials or retry can enter the packet. */
export function requestOwnedResourceRestartV1(channel=process){
 if(typeof channel.send!=='function'||channel.connected!==true)return Promise.reject(failure())
 const request=randomBytes(16).toString('hex')
 return new Promise((resolve,reject)=>{
  let settled=false
  const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);channel.off('message',message);channel.off('disconnect',disconnect);if(ok)resolve();else reject(failure())}
  const message=value=>finish(packet(value,'OWNED_RESOURCE_RESTARTED_V1',request))
  const disconnect=()=>finish(false),timer=setTimeout(disconnect,30000)
  channel.on('message',message);channel.on('disconnect',disconnect)
  try{channel.send({kind:'OWNED_RESOURCE_RESTART_V1',request},error=>{if(error)finish(false)})}catch{finish(false)}
 })
}

/** Bound to one parent-created child and the captured owner restart callback.
 * The caller closes the owner's resource; this relay never creates a resource. */
export function bindOwnedResourceRestartV1(child,restart){
 if(typeof restart!=='function'||typeof child.send!=='function')throw failure()
 let phase='idle',pending=Promise.resolve()
 const send=(kind,request)=>{try{if(child.connected===true&&child.exitCode===null)child.send({kind,request},()=>{})}catch{/* A lost reply cannot block owner cleanup or authorize another restart. */}}
 const message=value=>{
  if(phase!=='idle'||!packet(value,'OWNED_RESOURCE_RESTART_V1')){phase='closed';child.kill('SIGKILL');return}
  phase='running';const request=value.request
  pending=(async()=>{
   try{await restart();if(phase!=='running')return;phase='complete';send('OWNED_RESOURCE_RESTARTED_V1',request)}
   catch{phase='closed';send('OWNED_RESOURCE_RESTART_FAILED_V1',request)}
  })()
 }
 child.on('message',message)
 return Object.freeze({async close(){phase='closed';child.off('message',message);await pending}})
}
