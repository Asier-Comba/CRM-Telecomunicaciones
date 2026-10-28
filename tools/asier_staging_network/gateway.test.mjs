import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {Readable} from 'node:stream'
import {randomBytes} from 'node:crypto'
import {request as httpRequest} from 'node:http'
import {createEgressGateway,createIngressGateway} from './gateway.mjs'
import {supabaseOrigin,appTarget,gatewayOrigin,bodyLimit,publicIpv4,allowedSupabasePath,rewriteSupabaseRequest} from './policy.mjs'
import {createGatewayFetch} from './server-fetch.mjs'
async function listen(t,server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));return 'http://127.0.0.1:'+server.address().port}
const get=(url,headers)=>new Promise((resolve,reject)=>{const request=httpRequest(url,{headers},response=>{response.resume();response.on('end',()=>resolve({status:response.statusCode,headers:response.headers}))});request.on('error',reject);request.end()})
function upstream(calls,status=200,headers={}){return(target,options,callback)=>{const call={target:String(target),options};calls.push(call);const request=new EventEmitter();request.destroy=()=>request.emit('error',Error('closed'));request.end=bytes=>{call.body=String(bytes);queueMicrotask(()=>{const response=Readable.from([Buffer.from('synthetic-only')]);response.statusCode=status;response.headers={'content-type':'text/plain',...headers};callback(response)})};return request}}
test('public IPv4 policy rejects lateral, metadata, reserved and IPv6 destinations',()=>{
 for(const ip of ['0.0.0.0','10.1.2.3','100.64.0.1','127.0.0.1','169.254.169.254','172.31.0.1','192.168.0.2','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:8.8.8.8','not-an-ip'])assert.equal(publicIpv4(ip),false,ip)
 assert.equal(publicIpv4('8.8.8.8'),true)
})
test('egress only exposes Auth and REST paths on the fixed project',()=>{
 for(const path of ['/storage/v1/object/x','/realtime/v1','/','http://other.invalid/rest/v1/x','//other.invalid/auth/v1/user','/auth/v1/../../storage/v1/x','/auth\\v1/user','/auth/v1/%2fother','/rest/v1/%5cother'])assert.equal(allowedSupabasePath(path),false,path)
 assert.equal(rewriteSupabaseRequest(supabaseOrigin+'/rest/v1/rpc/example?x=1'),gatewayOrigin+'/rest/v1/rpc/example?x=1')
 for(const url of ['https://other.supabase.co/auth/v1/user',supabaseOrigin+'/storage/v1/x',supabaseOrigin+'/auth/v1/user#x'])assert.throws(()=>rewriteSupabaseRequest(url))
})
test('unauthorized paths cannot cause a DNS lookup or an upstream connection',async t=>{
 let dns=0;const calls=[],url=await listen(t,createEgressGateway({resolve:async()=>{dns++;return [{address:'8.8.8.8',family:4}]},transport:upstream(calls)}))
 for(const path of ['/storage/v1/x','/realtime/v1','/'])assert.equal((await fetch(url+path)).status,403)
 assert.equal(dns,0);assert.equal(calls.length,0)
})
test('DNS private results or mixed answers fail before transport',async t=>{
 for(const addresses of [[{address:'127.0.0.1',family:4}],[{address:'8.8.8.8',family:4},{address:'10.0.0.2',family:4}],[]]){
  const calls=[],url=await listen(t,createEgressGateway({resolve:async()=>addresses,transport:upstream(calls)}))
  assert.equal((await fetch(url+'/auth/v1/user')).status,502);assert.equal(calls.length,0)
 }
})
test('egress fixes upstream Host TLS identity address and body without trusting inbound Host',async t=>{
 const calls=[],url=await listen(t,createEgressGateway({resolve:async()=>[{address:'8.8.8.8',family:4}],transport:upstream(calls)}))
 const response=await fetch(url+'/rest/v1/rpc/example',{method:'POST',headers:{host:'evil.invalid','content-type':'application/json',authorization:'Bearer synthetic-user-only',cookie:'not-for-supabase=synthetic','x-forwarded-host':'other.supabase.co'},body:'{"synthetic":true}'})
 assert.equal(response.status,200);await response.text();assert.equal(calls.length,1)
 const call=calls[0],host=new URL(supabaseOrigin).hostname
 assert.equal(call.target,supabaseOrigin+'/rest/v1/rpc/example');assert.equal(call.options.headers.host,host)
 assert.equal(call.options.servername,host);assert.equal(call.options.rejectUnauthorized,true);assert.equal(call.options.family,4);assert.equal(call.options.agent,false)
 assert.equal(call.options.headers.cookie,undefined);assert.equal(call.options.headers['x-forwarded-host'],undefined)
 assert.equal(call.body,'{"synthetic":true}')
 await new Promise(resolve=>call.options.lookup(host,{},(_error,address,family)=>{assert.equal(address,'8.8.8.8');assert.equal(family,4);resolve()}))
})
test('egress does not expose or follow upstream redirects',async t=>{
 const calls=[],url=await listen(t,createEgressGateway({resolve:async()=>[{address:'8.8.8.8',family:4}],transport:upstream(calls,302,{location:'https://other.invalid/secret'})}))
 const response=await fetch(url+'/auth/v1/user');assert.equal(response.status,502);assert.equal(response.headers.has('location'),false);assert.equal(calls.length,1)
})
test('CONNECT cannot open a tunnel or trigger DNS',async t=>{
 let dns=0;const calls=[],url=await listen(t,createEgressGateway({resolve:async()=>{dns++;return[]},transport:upstream(calls)}))
 const status=await new Promise((resolve,reject)=>{const request=httpRequest(url,{method:'CONNECT',path:'other.invalid:443'});request.on('connect',(response,socket)=>{socket.destroy();resolve(response.statusCode)});request.on('error',reject);request.end()})
 assert.equal(status,403);assert.equal(dns,0);assert.equal(calls.length,0)
})
test('oversized upstream responses fail closed instead of returning truncated success',async t=>{
 const transport=(_target,_options,callback)=>{const request=new EventEmitter();request.end=()=>queueMicrotask(()=>{const response=Readable.from([Buffer.alloc(bodyLimit+1)]);response.statusCode=200;response.headers={};callback(response)});return request}
 const url=await listen(t,createEgressGateway({resolve:async()=>[{address:'8.8.8.8',family:4}],transport}))
 const response=await fetch(url+'/rest/v1/rpc/example');assert.equal(response.status,502);assert.ok((await response.text()).length<100)
})
const origin='https://staging.example.invalid',username='synthetic',password=randomBytes(32).toString('base64url')
const authorization='Basic '+Buffer.from(username+':'+password).toString('base64')
test('private ingress cannot start with insecure or incomplete identity configuration',()=>{
 for(const change of [{origin:'http://staging.example.invalid'},{username:'x:y'},{password:'short'},{password:undefined}])assert.throws(()=>createIngressGateway({origin,username,password,...change}),/PRIVATE_INGRESS_CONFIGURATION_REQUIRED/)
})
test('private ingress denies absent/wrong authentication before touching CRM',async t=>{
 const calls=[],url=await listen(t,createIngressGateway({origin,username,password,transport:upstream(calls)}))
 for(const supplied of ['',authorization+'wrong','Bearer synthetic']){const response=await fetch(url+'/login',{headers:{host:new URL(origin).host,authorization:supplied}});assert.equal(response.status,401);assert.ok(response.headers.has('www-authenticate'))}
 assert.equal(calls.length,0)
})
test('private ingress has a fixed target and never forwards private Basic credentials',async t=>{
 const calls=[],url=await listen(t,createIngressGateway({origin,username,password,transport:upstream(calls)}))
 const response=await get(url+'/login?test=1',{host:new URL(origin).host,authorization,cookie:'synthetic-session=only','x-forwarded-for':'spoofed','x-forwarded-proto':'http'})
 assert.equal(response.status,200);assert.equal(calls[0].target,appTarget+'/login?test=1')
 assert.equal(Object.hasOwn(calls[0].options.headers,'authorization'),false);assert.equal(calls[0].options.headers.cookie,'synthetic-session=only')
 assert.equal(calls[0].options.headers['x-forwarded-proto'],'https');assert.notEqual(calls[0].options.headers['x-forwarded-for'],'spoofed')
 assert.equal((await get(url+'/login',{host:'other.invalid',authorization})).status,403);assert.equal(calls.length,1)
})
test('private ingress preserves safe login redirects while egress stays redirect-closed',async t=>{
 for(const location of ['/login',origin+'/dashboard']){
  const calls=[],url=await listen(t,createIngressGateway({origin,username,password,transport:upstream(calls,302,{location})}))
  const response=await get(url+'/dashboard',{host:new URL(origin).host,authorization})
  assert.equal(response.status,302);assert.equal(response.headers.location,location)
 }
})
test('private ingress rejects external ambiguous or credential-bearing redirects',async t=>{
 for(const location of ['https://other.invalid/login','//other.invalid/login','https://staging.example.invalid@other.invalid/login','https://x:y@staging.example.invalid/login','/\\other.invalid/login']){
  const url=await listen(t,createIngressGateway({origin,username,password,transport:upstream([],302,{location})}))
  const response=await get(url+'/dashboard',{host:new URL(origin).host,authorization})
  assert.equal(response.status,502);assert.equal(response.headers.location,undefined)
 }
})
test('DNS budget cannot be absent, unbounded or raised past five seconds',()=>{
 for(const dnsTimeoutMs of [0,9,5001,Infinity,NaN,'5000'])assert.throws(()=>createEgressGateway({dnsTimeoutMs}),/DNS_BUDGET_INVALID/)
})
test('upstream deadline cannot be unbounded or raised past thirty seconds in either gateway',()=>{
 for(const upstreamDeadlineMs of [0,9,30001,Infinity,'30000']){
  assert.throws(()=>createEgressGateway({upstreamDeadlineMs}),/UPSTREAM_BUDGET_INVALID/)
  assert.throws(()=>createIngressGateway({origin,username,password,upstreamDeadlineMs}),/UPSTREAM_BUDGET_INVALID/)
 }
})
test('egress bounds concurrent unresolved DNS requests without admitting a fifth lookup',async t=>{
 const releases=[];let entered;const fourEntered=new Promise(resolve=>{entered=resolve})
 const url=await listen(t,createEgressGateway({resolve:()=>new Promise(resolve=>{releases.push(resolve);if(releases.length===4)entered()}),transport:upstream([])}))
 const requests=Array.from({length:4},()=>fetch(url+'/auth/v1/user'));await fourEntered
 const fifth=fetch(url+'/auth/v1/user');let timer
 try{const status=await Promise.race([fifth.then(r=>r.status),new Promise(resolve=>{timer=setTimeout(()=>resolve('UNBOUNDED_CONCURRENCY'),500)})]);assert.equal(status,503);assert.equal(releases.length,4)}
 finally{clearTimeout(timer);for(const release of releases)release([{address:'8.8.8.8',family:4}]);await Promise.all([...requests,fifth])}
})
test('egress cancels an unresolved DNS lookup within its bounded DNS budget',async t=>{
 let release,aborted=false
 const url=await listen(t,createEgressGateway({dnsTimeoutMs:25,resolve:(_host,options)=>new Promise((resolve,reject)=>{release=resolve;options.signal?.addEventListener('abort',()=>{aborted=true;reject(Error('synthetic-abort'))},{once:true})}),transport:upstream([])}))
 const request=fetch(url+'/auth/v1/user');let timer
 try{const status=await Promise.race([request.then(r=>r.status),new Promise(resolve=>{timer=setTimeout(()=>resolve('UNBOUNDED_DNS'),500)})]);assert.equal(status,502);assert.equal(aborted,true)}
 finally{clearTimeout(timer);release?.([{address:'8.8.8.8',family:4}]);await request}
})
test('client cancellation retires late DNS without starting upstream traffic',async t=>{
 let entered,release,notifyAbort,timer
 const started=new Promise(resolve=>{entered=resolve}),aborted=new Promise(resolve=>{notifyAbort=resolve}),calls=[]
 const url=await listen(t,createEgressGateway({resolve:(_host,options)=>new Promise(resolve=>{release=resolve;options.signal.addEventListener('abort',()=>notifyAbort(true),{once:true});entered()}),transport:upstream(calls)}))
 const request=httpRequest(url+'/auth/v1/user');request.on('error',()=>{});request.end();await started;request.destroy()
 const cancelled=await Promise.race([aborted,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),500)})]);clearTimeout(timer)
 release([{address:'8.8.8.8',family:4}]);await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve))
 assert.deepEqual({cancelled,upstreamCalls:calls.length},{cancelled:true,upstreamCalls:0})
})
test('absolute upstream deadline stops a continuously dripping response',async t=>{
 let stop,timer,stopped=false
 const transport=(_target,_options,callback)=>{
  const request=new EventEmitter();let interval,response
  request.destroy=()=>{stopped=true;clearInterval(interval);response?.destroy();request.emit('error',Error('synthetic-close'))}
  stop=request.destroy
  request.end=()=>{response=new Readable({read(){}});response.statusCode=200;response.headers={};callback(response);interval=setInterval(()=>response.push(Buffer.from('synthetic')),5)}
  return request
 }
 const url=await listen(t,createEgressGateway({upstreamDeadlineMs:25,resolve:async()=>[{address:'8.8.8.8',family:4}],transport}))
 const request=fetch(url+'/auth/v1/user')
 try{const status=await Promise.race([request.then(r=>r.status),new Promise(resolve=>{timer=setTimeout(()=>resolve('UNBOUNDED_DRIP'),500)})]);assert.equal(status,504);assert.equal(stopped,true)}
 finally{clearTimeout(timer);stop?.();await request}
})
test('SDK fetch adapter preserves the public origin contract and request transport semantics',async()=>{
 const calls=[],transport=createGatewayFetch(async(request,options)=>{calls.push({request,options});return new Response('{}')})
 await transport(supabaseOrigin+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:'synthetic-public-only',authorization:'Bearer synthetic-user-only'},body:'{}'})
 assert.equal(calls[0].request.url,gatewayOrigin+'/auth/v1/token?grant_type=refresh_token');assert.equal(calls[0].request.method,'POST')
 assert.equal(calls[0].request.headers.get('authorization'),'Bearer synthetic-user-only');assert.equal(await calls[0].request.text(),'{}');assert.equal(calls[0].options.redirect,'error')
 await assert.rejects(()=>transport('https://other.invalid/auth/v1/user'));assert.equal(calls.length,1)
})
