// Executes inside the owned synthetic task. Output contains booleans/status only.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {request} from 'node:http'
import {connect} from 'node:net'
import {Resolver,lookup} from 'node:dns/promises'
import {stagingEasyPanelOriginV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const input=JSON.parse(readFileSync(0,'utf8')),checks=[]
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name)}
async function tcp(address,port){return new Promise(resolve=>{const socket=connect({host:address,port});let done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value)};socket.setTimeout(1500);socket.on('connect',()=>finish(true));socket.on('error',()=>finish(false));socket.on('timeout',()=>finish(false))})}
async function http(host,path,headers={}){return new Promise((resolve,reject)=>{const req=request({host,port:8080,path,headers,timeout:10000},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));res.on('error',reject)});req.on('timeout',()=>req.destroy(Error('LAB_HTTP_TIMEOUT')));req.on('error',reject);req.end()})}
if(input.kind==='internal'){
 check((await lookup('crm-telecom-egress')).family===4,'internal_egress_alias_resolves')
 check((await lookup('crm-telecom-staging')).family===4,'internal_app_alias_resolves')
 const resolver=new Resolver({timeout:500,tries:1})
 let resolved=false;try{await resolver.resolve4('zgwotxnyqzfuzcnmgvtn.supabase.co');resolved=true}catch{}
 check(!resolved,'external_dns_resolution_denied')
 check(!await tcp(input.canaryIp,8081),'lateral_shared_canary_ip_denied')
 check(!await tcp(input.supabaseIp,443),'direct_supabase_ip_denied')
 const health=await http('crm-telecom-egress','/auth/v1/health')
 check([200,401].includes(health.status),'fixed_supabase_real_tls_transport_responds')
 check((await http('crm-telecom-egress','/storage/v1/object/x')).status===403,'storage_gateway_denied')
 check((await http('crm-telecom-egress','http://169.254.169.254/latest')).status===403,'absolute_metadata_target_denied')
}else if(input.kind==='outside'){
 check(await tcp(input.canaryIp,8081),'owned_canary_positive_control')
 check(!await tcp(input.appIp,3000),'outside_private_app_ip_denied')
 const headers={host:new URL(stagingEasyPanelOriginV1).host}
 check((await http('crm-telecom-ingress','/login',headers)).status===401,'private_ingress_unauthenticated_denied')
 const result=await http('crm-telecom-ingress','/login',{...headers,authorization:'Basic '+Buffer.from(input.username+':'+input.password).toString('base64')})
 check(result.status===200&&result.body==='CRM_LAB_ONLY','private_ingress_authenticated_fixed_app')
}else throw Error('DISPOSABLE_PROBE_INVALID')
console.log(JSON.stringify({checks,result:'PASS'}))
