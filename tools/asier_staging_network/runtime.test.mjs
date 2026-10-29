import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createServer,request} from 'node:http'
import {createConnection} from 'node:net'
import {randomBytes} from 'node:crypto'
import {createIngressGateway,createEgressGateway} from './gateway.mjs'
import {gatewayRuntimeSettingsV1,closeGatewayRuntimeV1} from './runtime.mjs'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {stagingEasyPanelOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const env={PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingEasyPanelOriginV1,NEXT_PUBLIC_APP_URL:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'}
// Synthetic policy only. Never persisted, copied into an image or used as real release approval.
const policy={version:'product.staging.runtime.v1',status:'ACCEPTED',origin:stagingEasyPanelOriginV1,auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false}
const binding=createPublicBuildBinding(env)
test('tracked PROPOSED policy cannot enable either packaged helper',()=>{
 const tracked=JSON.parse(readFileSync('infra/platform/product-staging-runtime-policy.json','utf8'))
 assert.equal(tracked.status,'PROPOSED')
 for(const role of ['ingress','egress'])assert.throws(()=>gatewayRuntimeSettingsV1(role,env,tracked,binding),/GATEWAY_RUNTIME_ADMISSION_DENIED/)
})
test('only fixed helper roles and listen address are eligible under a synthetic complete policy',()=>{
 for(const role of ['ingress','egress'])assert.deepEqual(gatewayRuntimeSettingsV1(role,env,policy,binding),{role,origin:stagingEasyPanelOriginV1,port:8080,host:'0.0.0.0'})
 for(const role of ['',undefined,'app','forward-proxy','INGRESS'])assert.throws(()=>gatewayRuntimeSettingsV1(role,env,policy,binding),/GATEWAY_ROLE_INVALID/)
})
test('helper eligibility never transfers across missing reviews origin build or enabled capabilities',()=>{
 for(const name of ['w2','w4','w5'])assert.throws(()=>gatewayRuntimeSettingsV1('egress',env,{...policy,reviews:{...policy.reviews,[name]:'PENDING'}},binding),/GATEWAY_RUNTIME_ADMISSION_DENIED/)
 for(const patch of [{APP_ENV:'production'},{PLATFORM_TARGET:'PROD'},{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined},{NEXT_PUBLIC_APP_URL:'https://other.invalid'},{PRODUCT_DOCUMENT_LIBRARY_ENABLED:'true'},{PRODUCT_DOCUMENT_CONTENT_ENABLED:'true'},{SUPABASE_SERVICE_ROLE_KEY:'synthetic-forbidden'}])assert.throws(()=>gatewayRuntimeSettingsV1('egress',{...env,...patch},policy,binding),/GATEWAY_RUNTIME_ADMISSION_DENIED/)
 assert.throws(()=>gatewayRuntimeSettingsV1('ingress',env,policy,{...binding,public_sha256:'0'.repeat(64)}),/GATEWAY_RUNTIME_ADMISSION_DENIED/)
})
test('gateway shutdown closes an actual held HTTP connection within its bounded grace',async()=>{
 let arrive;const received=new Promise(resolve=>{arrive=resolve})
 const server=createServer((_req,res)=>{res.writeHead(200);res.write('held');arrive()})
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const client=request({host:'127.0.0.1',port:server.address().port},response=>response.resume());client.on('error',()=>{});client.end()
 try{await received;assert.deepEqual(await closeGatewayRuntimeV1(server,{deadlineMs:10}),{closed:true,forced:true})}finally{client.destroy();server.closeAllConnections();server.close()}
})
test('idle gateway shutdown is graceful and its deadline cannot be removed or raised',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 for(const deadlineMs of [0,-1,Infinity,30001])assert.throws(()=>closeGatewayRuntimeV1(server,{deadlineMs}),/GATEWAY_SHUTDOWN_BUDGET_INVALID/)
 assert.deepEqual(await closeGatewayRuntimeV1(server),{closed:true,forced:false})
})

for(const role of ['ingress','egress'])test('rejected CONNECT with peer write-half open cannot outlive '+role+' shutdown',async()=>{
 let dns=0,upstream=0
 const server=role==='egress'?createEgressGateway({resolve:async()=>{dns++;throw Error('UNEXPECTED_DNS')},transport:()=>{upstream++;throw Error('UNEXPECTED_UPSTREAM')}}):createIngressGateway({origin:stagingEasyPanelOriginV1,username:'crm_test',password:randomBytes(32).toString('base64url'),transport:()=>{upstream++;throw Error('UNEXPECTED_UPSTREAM')}})
 const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket))})
 let client,stopping,setupTimer,observeTimer
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  client=createConnection({host:'127.0.0.1',port:server.address().port,allowHalfOpen:true})
  let reply='';client.on('data',chunk=>{reply+=chunk.toString('ascii')});client.on('error',()=>{})
  await new Promise((resolve,reject)=>{setupTimer=setTimeout(()=>reject(Error('CONNECT_PRECONDITION_TIMEOUT')),2000);client.once('error',reject);client.once('end',()=>{clearTimeout(setupTimer);resolve()});client.once('connect',()=>client.write('CONNECT blocked.invalid:443 HTTP/1.1\r\nHost: blocked.invalid:443\r\n\r\n'))})
  assert.match(reply,/^HTTP\/1\.1 403\b/);assert.equal(client.readableEnded,true);assert.equal(client.writableEnded,false)
  assert.equal(dns,0);assert.equal(upstream,0)
  stopping=closeGatewayRuntimeV1(server,{deadlineMs:25})
  const outcome=await Promise.race([stopping,new Promise(resolve=>{observeTimer=setTimeout(()=>resolve(null),500)})])
  assert.ok(outcome?.closed,'CONNECT cannot survive the declared shutdown grace')
  assert.ok([...sockets].every(socket=>socket.destroyed),'all owned raw sockets must be closed')
 }finally{
  clearTimeout(setupTimer);clearTimeout(observeTimer);client?.destroy();for(const socket of sockets)socket.destroy()
  if(stopping)await stopping;else server.close()
 }
})
