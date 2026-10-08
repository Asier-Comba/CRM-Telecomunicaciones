import {createHmac,timingSafeEqual} from 'node:crypto'
import {hash} from './lib.mjs'
const identity=/^[A-Za-z0-9_-]{1,80}$/
const address=/^[^\s@\r\n]{1,128}@[^\s@\r\n]{1,128}$/
const fail=code=>{throw new Error(code)}
// Disposable queue contract. No provider or business-domain dispatcher is wired.
export function createMailSink({scope,authorize,allowlist,senders,templates,maxQueue=100,maxAttempts=3}){
 if(scope!=='DISPOSABLE_SIMULATION'||typeof authorize!=='function'||!Array.isArray(allowlist)||allowlist.some(a=>!address.test(a)||!a.endsWith('@example.invalid'))||!Number.isSafeInteger(maxQueue)||maxQueue<1||!Number.isSafeInteger(maxAttempts)||maxAttempts<1)fail('DISPOSABLE_SYNTHETIC_MAIL_ONLY')
 const recipients=new Set(allowlist),queue=new Map(),captures=[],audit=[],seen=new Set(),inFlight=new Set()
 const approvedTemplates=structuredClone(templates??{}),approvedSenders=structuredClone(senders??{})
 const event=(j,status)=>audit.push({component:'mail',status,tenant_digest:hash(j.tenant),operation_digest:j.key,attempt:j.attempts})
 async function authorized(j){const proof=await authorize({tenant:j.tenant,actor:j.actor,recipient:j.recipient,template:j.template});if(!proof||proof.tenant!==j.tenant||proof.actor!==j.actor||proof.authorized!==true||proof.consent!==true)fail('MAIL_AUTHORIZATION_REQUIRED')}
 return {
  async enqueue(input){
   if(!input||Object.keys(input).some(k=>!['tenant','actor','recipient','sender','template','idempotency_key'].includes(k))||!['tenant','actor','template','idempotency_key'].every(k=>identity.test(input[k]??'')))fail('MAIL_INPUT_INVALID')
   if(!recipients.has(input.recipient)||input.sender!==approvedSenders[input.tenant]||!address.test(input.sender??'')||!input.sender.endsWith('@example.invalid')||!Object.hasOwn(approvedTemplates,input.template)||typeof approvedTemplates[input.template]!=='string'||Buffer.byteLength(approvedTemplates[input.template])>65536)fail('MAIL_BINDING_FORBIDDEN')
   const key=hash(`${input.tenant}:${input.idempotency_key}`),payload=hash(JSON.stringify(input));await authorized(input)
   if(queue.has(key)){if(queue.get(key).payload!==payload)fail('IDEMPOTENCY_PAYLOAD_CONFLICT');return {status:queue.get(key).status,operation_digest:key,duplicate:true}}
   if([...queue.values()].filter(j=>['QUEUED','RETRY'].includes(j.status)).length>=maxQueue)fail('MAIL_QUEUE_LIMIT')
   const j={...input,key,payload,attempts:0,status:'QUEUED'};queue.set(key,j);event(j,'QUEUED');return {status:j.status,operation_digest:key,duplicate:false}
  },
  async dispatch(key,{transport='SINK',failure=null}={}){
   const j=queue.get(key);if(!j)fail('MAIL_OPERATION_UNKNOWN')
   if(!['QUEUED','RETRY'].includes(j.status))return {status:j.status,duplicate:true}
   if(inFlight.has(key))return {status:'IN_FLIGHT',duplicate:true}
   inFlight.add(key)
   try{
   try{await authorized(j)}catch{j.status='REVOKED';event(j,j.status);return {status:j.status}}
   if(j.attempts>=maxAttempts){j.status='FAILED';event(j,j.status);return {status:j.status}}
   j.attempts++
   if(transport!=='SINK'||failure){j.status=j.attempts>=maxAttempts?'FAILED':'RETRY';event(j,j.status);return {status:j.status}}
   const message_id=`sink-${j.key}`;captures.push({message_id,tenant:j.tenant,recipient:j.recipient,sender:j.sender,template:j.template,body:approvedTemplates[j.template]});j.status='CAPTURED';j.message_id=message_id;event(j,j.status);return {status:j.status,message_id,delivery_proven:false}
   }finally{inFlight.delete(key)}
  },
  bounce({body,signature,key,now=Date.now()}){
   if(!Buffer.isBuffer(key)||key.length<32||typeof body!=='string'||Buffer.byteLength(body)>8192||!/^[a-f0-9]{64}$/.test(signature??''))fail('BOUNCE_SIGNATURE_INVALID')
   const expected=createHmac('sha256',key).update(body).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))fail('BOUNCE_SIGNATURE_INVALID')
   let p;try{p=JSON.parse(body)}catch{fail('BOUNCE_PAYLOAD_INVALID')}
   if(!p||Object.keys(p).some(k=>!['tenant','message_id','nonce','at','status'].includes(k))||!identity.test(p.nonce??'')||!Number.isSafeInteger(p.at)||Math.abs(now-p.at)>300000||p.status!=='BOUNCED')fail('BOUNCE_PAYLOAD_INVALID')
   const replay=hash(`${p.tenant}:${p.nonce}`);if(seen.has(replay))fail('BOUNCE_REPLAY_FORBIDDEN')
   const j=[...queue.values()].find(j=>j.message_id===p.message_id&&j.tenant===p.tenant);if(!j||j.status!=='CAPTURED')fail('BOUNCE_BINDING_FORBIDDEN')
   seen.add(replay);j.status='BOUNCED';event(j,j.status);return {status:j.status}
  },
  capture:()=>structuredClone(captures),
  metadata:()=>({scope:'DISPOSABLE_SIMULATION',pending:[...queue.values()].filter(j=>['QUEUED','RETRY'].includes(j.status)).length,captured:captures.length,audit:structuredClone(audit),external_delivery_proven:false})
 }
}
