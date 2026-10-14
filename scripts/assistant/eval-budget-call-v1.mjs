import {createHash} from 'node:crypto'

const unavailable=()=>Error('EVAL_BUDGET_CALL_UNAVAILABLE')
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=10000000
function fields(raw,keys){
 try{
  if(!raw||typeof raw!=='object'||Object.getPrototypeOf(raw)!==Object.prototype)throw unavailable()
  const d=Object.getOwnPropertyDescriptors(raw)
  if(Reflect.ownKeys(d).length!==keys.length||keys.some(k=>!d[k]?.enumerable||!('value'in d[k])))throw unavailable()
  return Object.freeze(Object.fromEntries(keys.map(k=>[k,d[k].value])))
 }catch{throw unavailable()}
}
const digest=body=>createHash('sha256').update(body).digest('hex')
function charge(input,cached,output,prices){
 const numerator=BigInt(input-cached)*BigInt(prices.input)+BigInt(cached)*BigInt(prices.cachedInput)+BigInt(output)*BigInt(prices.output)
 const value=Number((numerator+999999n)/1000000n)
 if(!Number.isSafeInteger(value)||value<0||value>500000)throw unavailable()
 return value
}

/** Trusted host call coordinator, not a spend authorization or a network client.
 * The caller must supply independently verified pricing and an input-token
 * bound for these exact bytes. No character/token estimates, default model,
 * automatic ledger creation, retries or environment approval bypass.
 * Runtime eval-live-v2 remains denied until canonical wiring is reviewed. */
export async function runBudgetedEvaluationCallV1({ledger,batchRef,callRef,body,quote,send,signal}){
 let request,prices,maximum
 try{
  if(typeof body!=='string'||Buffer.byteLength(body)>100000||typeof send!=='function')throw unavailable()
  quote=fields(quote,['model','bodySha256','inputTokenBound','prices'])
  request=JSON.parse(body)
  if(!request||request.model!==quote.model||request.store!==false||request.stream!==false||request.service_tier!=='default'
   ||typeof request.input!=='string'||!request.input||Buffer.byteLength(request.input)>32000
   ||(request.instructions!==undefined&&(typeof request.instructions!=='string'||Buffer.byteLength(request.instructions)>12000))
   ||Object.keys(request).some(k=>!['model','store','stream','service_tier','reasoning','instructions','input','max_output_tokens','text'].includes(k))
   ||!count(request.max_output_tokens)||request.max_output_tokens<256||request.max_output_tokens>8192)throw unavailable()
  if(typeof quote.model!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(quote.model)
   ||quote.bodySha256!==digest(body)||!count(quote.inputTokenBound)||quote.inputTokenBound===0)throw unavailable()
  prices=fields(quote.prices,['input','cachedInput','output'])
  if(Object.values(prices).some(v=>!Number.isSafeInteger(v)||v<0||v>1000000000000)||prices.input===0||prices.output===0)throw unavailable()
  maximum=charge(quote.inputTokenBound,prices.cachedInput>prices.input?quote.inputTokenBound:0,request.max_output_tokens,prices)
  if(maximum===0)throw unavailable()
 }catch{throw unavailable()}
 if(signal?.aborted)return Object.freeze({status:'cancelled_before_reservation',providerRequests:0})
 const reservation=ledger.reserve({batchRef,callRef,maxCostMicrousd:maximum})
 if(reservation.status!=='reserved')return Object.freeze({status:reservation.status,providerRequests:0})
 let response,knownCost=null,providerRequests=0
 try{
  // The committed hold exists before calling the trusted transport, including
  // when it throws synchronously, loses a response or the process is killed.
  if(signal?.aborted)throw unavailable()
  providerRequests=1
  response=await send(body,signal)
  const u=response?.usage,details=u?.input_tokens_details
  if(response?.model===quote.model&&response?.service_tier==='default'
   &&['completed','incomplete'].includes(response?.status)
   &&count(u?.input_tokens)&&u.input_tokens<=quote.inputTokenBound
   &&count(u?.output_tokens)&&u.output_tokens<=request.max_output_tokens
   &&count(u?.total_tokens)&&u.total_tokens===u.input_tokens+u.output_tokens
   &&count(details?.cached_tokens)&&details.cached_tokens<=u.input_tokens
   &&(details.cache_write_tokens===undefined||details.cache_write_tokens===0)){
   knownCost=charge(u.input_tokens,details.cached_tokens,u.output_tokens,prices)
  }
 }catch{knownCost=null}
 const settled=ledger.settle({callRef,knownCostMicrousd:knownCost})
 return Object.freeze({status:settled.status,providerRequests,reservedMicrousd:maximum,
  costMicrousd:settled.status==='settled'?knownCost:null,costBasis:'SUPPLIED_TARIFF_CEILING_MICROUSD_NOT_PROVIDER_INVOICE',
  response,dispatchAuthorized:false})
}
