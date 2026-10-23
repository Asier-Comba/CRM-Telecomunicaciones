import {test} from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import {runnerAllowed,assertEmptyDaemon,authorityAllowed,ownedResource} from '../../scripts/deployment/network-policy.mjs'
import {egressServer} from '../../scripts/deployment/network-fixture.mjs'

const env={CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',PLATFORM_TARGET:'LOCAL'}
test('lab rejects shared hosts, hosted targets, secrets and non-GitHub-hosted runners before mutations',()=>{
 assert.equal(runnerAllowed(env,'linux'),true)
 for(const patch of [{CI:'false'},{GITHUB_ACTIONS:'false'},{RUNNER_ENVIRONMENT:'self-hosted'},{PLATFORM_TARGET:'STAGING'},{PLATFORM_TARGET:'PROD'},{NODE_ENV:'production'},{SUPABASE_ACCESS_TOKEN:'canary'},{SUPABASE_DB_PASSWORD:'canary'}])assert.equal(runnerAllowed({...env,...patch},'linux'),false)
 assert.equal(runnerAllowed(env,'win32'),false)
 assert.doesNotThrow(()=>assertEmptyDaemon({swarm:'inactive',containers:0}))
 for(const snapshot of [{swarm:'active',containers:0},{swarm:'inactive',containers:1},{swarm:'pending',containers:0}])assert.throws(()=>assertEmptyDaemon(snapshot),/EMPTY_DISPOSABLE/)
})
test('CONNECT accepts only the exact canonical approved authority, without suffixes or URL interpretation',()=>{
 const approved='supabase.fixture.test:8443'
 assert.equal(authorityAllowed(approved,approved),true)
 for(const value of ['supabase.fixture.test:443','supabase.fixture.test.evil:8443','SUPABASE.fixture.test:8443','supabase.fixture.test.:8443','supabase.fixture.test:08443','https://'+approved,approved+'/',approved+'@evil',approved+'\r\nHost: evil','127.0.0.1:8443','[::1]:8443','victim:3000','*.fixture.test:8443'])assert.equal(authorityAllowed(value,approved),false)
 for(const value of ['127.0.0.1:8443','bad..test:8443','host:65536'])assert.equal(authorityAllowed(value,value),false)
})
test('cleanup requires both the captured full resource ID and this run label',()=>{
 const id='a'.repeat(64),r={Id:id,Labels:{'crm.telecom.networklab':'owned'}}
 assert.equal(ownedResource(r,id,'owned'),true)
 assert.equal(ownedResource(r,'b'.repeat(64),'owned'),false)
 assert.equal(ownedResource(r,id,'other'),false)
 assert.equal(ownedResource({...r,Labels:{}},id,'owned'),false)
})
test('real CONNECT denial performs no dial; admitted tunnel carries only the fixed target bytes',async()=>{
 const echo=net.createServer(socket=>socket.on('data',b=>socket.write(b)))
 await new Promise(r=>echo.listen(0,'127.0.0.1',r))
 let calls=0
 const proxy=egressServer('supabase.fixture.test:8443',()=>{calls++;return net.connect({host:'127.0.0.1',port:echo.address().port})})
 await new Promise(r=>proxy.listen(0,'127.0.0.1',r))
 const connect=authority=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:proxy.address().port,method:'CONNECT',path:authority})
  req.on('error',reject);req.setTimeout(2000,()=>req.destroy(new Error('TEST_TIMEOUT')))
  req.on('connect',(r,s)=>{if(r.statusCode!==200){s.destroy();resolve(r.statusCode);return}s.once('data',bytes=>{s.destroy();resolve(bytes.toString())});s.write('synthetic-only')});req.end()
 })
 try{
  for(const target of ['victim:3000','supabase.fixture.test:443','supabase.fixture.test.evil:8443'])assert.equal(await connect(target),403)
  assert.equal(calls,0)
  assert.equal(await connect('supabase.fixture.test:8443'),'synthetic-only');assert.equal(calls,1)
 }finally{await new Promise(r=>proxy.close(r));await new Promise(r=>echo.close(r))}
})
