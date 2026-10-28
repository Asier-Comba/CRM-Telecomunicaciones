import {createServer} from 'node:http'
import {request as httpsRequest} from 'node:https'
import {request as httpRequest} from 'node:http'
import {Resolver} from 'node:dns/promises'
import {createHash,timingSafeEqual} from 'node:crypto'
import {supabaseOrigin,appTarget,bodyLimit,publicIpv4,canonicalHttpsOrigin,allowedSupabasePath,safeIngressRedirect} from './policy.mjs'

const hash=value=>createHash('sha256').update(value).digest()
const hop=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade','content-length'])
const supabaseHeaders=new Set(['authorization','apikey','content-type','accept','accept-profile','content-profile','prefer','range','range-unit','x-client-info','x-supabase-api-version','if-match','if-none-match'])
function headersWithoutHop(headers){const denied=new Set([...hop,...String(headers.connection??'').toLowerCase().split(',').map(v=>v.trim())]);return Object.fromEntries(Object.entries(headers).filter(([name])=>!denied.has(name.toLowerCase())))}
function closed(response,status){if(!response.headersSent)response.writeHead(status,{'cache-control':'no-store','content-type':'text/plain'});response.end('Gateway request unavailable')}
async function body(request){const chunks=[];let count=0;for await(const chunk of request){count+=chunk.length;if(count>bodyLimit)throw Error('BODY_TOO_LARGE');chunks.push(chunk)}return Buffer.concat(chunks)}
function server(handler,maxConcurrent){
 let active=0
 const instance=createServer({maxHeaderSize:16384},(req,res)=>{
  if(active>=maxConcurrent){req.resume();res.setHeader('retry-after','1');return closed(res,503)}
  active++;Promise.resolve(handler(req,res)).catch(()=>closed(res,502)).finally(()=>{active--})
 })
 instance.maxConnections=maxConcurrent*4;instance.maxRequestsPerSocket=32
 instance.requestTimeout=60000;instance.headersTimeout=10000;instance.keepAliveTimeout=5000
 instance.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'))
 instance.on('upgrade',(_req,socket)=>socket.destroy())
 return instance
}
async function forward(request,response,target,transport,options={},redirectOrigin){
 let bytes;try{bytes=await body(request)}catch{return closed(response,413)}
 const headers={...headersWithoutHop(options.headers??request.headers),'content-length':String(bytes.length)}
 // No stdout/stderr access logs, payloads, JWTs, cookies or DNS answers.
 await new Promise(resolve=>{
  const upstream=transport(target,{...options,method:request.method,headers,timeout:30000},async result=>{
   if(result.statusCode>=300&&result.statusCode<400&&result.statusCode!==304&&(!redirectOrigin||!safeIngressRedirect(result.headers.location,redirectOrigin))){result.resume();closed(response,502);return resolve()}
   try{const chunks=[];let count=0;for await(const chunk of result){count+=chunk.length;if(count>bodyLimit){result.destroy();throw Error('UPSTREAM_TOO_LARGE')}chunks.push(chunk)}response.writeHead(result.statusCode??502,headersWithoutHop(result.headers));response.end(Buffer.concat(chunks))}catch{closed(response,502)}finally{resolve()}
  })
  upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{closed(response,502);resolve()});upstream.end(bytes)
 })
}
async function resolveA(hostname,{signal}){
 const resolver=new Resolver({timeout:1500,tries:1}),cancel=()=>resolver.cancel()
 signal.addEventListener('abort',cancel,{once:true})
 try{return(await resolver.resolve4(hostname)).map(address=>({address,family:4}))}finally{signal.removeEventListener('abort',cancel)}
}
export function createEgressGateway({resolve=resolveA,transport=httpsRequest,dnsTimeoutMs=5000}={}){
 if(!Number.isInteger(dnsTimeoutMs)||dnsTimeoutMs<10||dnsTimeoutMs>5000)throw Error('DNS_BUDGET_INVALID')
 const origin=new URL(supabaseOrigin)
 return server(async(req,res)=>{
  if(!['GET','HEAD','POST','PATCH','PUT','DELETE'].includes(req.method)||!allowedSupabasePath(req.url))return closed(res,403)
  const controller=new AbortController();let timer,addresses
  try{addresses=await Promise.race([resolve(origin.hostname,{family:4,all:true,signal:controller.signal}),new Promise((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('DNS_DEADLINE'))},dnsTimeoutMs)})])}finally{clearTimeout(timer)}
  if(!Array.isArray(addresses)||!addresses.length||addresses.length>16||addresses.some(row=>row.family!==4||!publicIpv4(row.address)))return closed(res,502)
  const address=addresses[0].address
  const headers=Object.fromEntries(Object.entries(headersWithoutHop(req.headers)).filter(([name])=>supabaseHeaders.has(name)))
  await forward(req,res,new URL(req.url,origin),transport,{headers:{...headers,host:origin.host},agent:false,family:4,servername:origin.hostname,rejectUnauthorized:true,lookup:(_host,options,callback)=>options.all?callback(null,[{address,family:4}]):callback(null,address,4)})
 },4)
}
export function createIngressGateway({origin,username,password,transport=httpRequest}={}){
 if(!canonicalHttpsOrigin(origin)||typeof username!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(username)||typeof password!=='string'||password.length<32||password.length>512||/[\r\n\0]/.test(password))throw Error('PRIVATE_INGRESS_CONFIGURATION_REQUIRED')
 const authorization=hash('Basic '+Buffer.from(username+':'+password).toString('base64')),host=new URL(origin).host
 return server(async(req,res)=>{
  const supplied=typeof req.headers.authorization==='string'?req.headers.authorization:''
  if(supplied.length>2048||!timingSafeEqual(hash(supplied),authorization)){res.setHeader('www-authenticate','Basic realm="Private CRM staging", charset="UTF-8"');return closed(res,401)}
  if(req.headers.host!==host||typeof req.url!=='string'||!req.url.startsWith('/')||req.url.startsWith('//')||/[\\\r\n\0]/.test(req.url))return closed(res,403)
  const headers={...headersWithoutHop(req.headers),host,'x-forwarded-proto':'https','x-forwarded-host':host,'x-forwarded-for':req.socket.remoteAddress};delete headers.authorization
  await forward(req,res,new URL(req.url,appTarget),transport,{headers},origin)
 },16)
}
