import assert from 'node:assert/strict'
import test from 'node:test'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {createFramedFixtureSessionV1} from '../../scripts/security/native-postgres/persistent-fixture-session.mjs'

function fixture(){
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null
 let terminated=0,wire='';child.stdin.on('data',b=>{wire+=b.toString()});child.kill=()=>{}
 const session=createFramedFixtureSessionV1(child,()=>{terminated++})
 function markers(){const m=[...wire.matchAll(/\\echo (fixture_(?:start|end)_[0-9a-f]+)/g)];return [m.at(-2)[1],m.at(-1)[1]]}
 function reply(value){const [start,end]=markers();child.stdout.write(start+'\n'+value+'\n'+end+'\n')}
 function end(){child.exitCode=0;child.emit('close',0)}
 return {child,session,markers,reply,end,terminated:()=>terminated,wire:()=>wire}
}

test('one framed session supports sequential requests and fragmented UTF8 result lines',async()=>{
 const f=fixture(),a=f.session.query('select original_result;'),[start,end]=f.markers()
 const content=Buffer.from(start+'\r\n'+JSON.stringify({label:'José',backend:42})+'\r\n'+end+'\r\n')
 const split=content.indexOf(Buffer.from('é'))+1;f.child.stdout.write(content.subarray(0,split));f.child.stdout.write(content.subarray(split))
 assert.deepEqual(JSON.parse(await a),{label:'José',backend:42})
 const b=f.session.query('select same_backend');f.reply('42');assert.equal(await b,'42');assert.equal(f.terminated(),0);f.end()
})
test('a concurrent query cannot interleave SQL inside an active transaction',async()=>{
 const f=fixture(),a=f.session.query('begin;select original;')
 await assert.rejects(f.session.query('select competing;'),{message:'NATIVE_SESSION_UNAVAILABLE'})
 assert.ok(!f.wire().includes('competing'));f.reply('original');assert.equal(await a,'original');f.end()
})
test('invalid native framing closes the owned session instead of accepting a premature result',async()=>{
 const f=fixture(),a=f.session.query('select original;'),rejected=assert.rejects(a,{message:'NATIVE_SESSION_UNAVAILABLE'})
 f.child.stdout.write(f.markers()[1]+'\n');await rejected;assert.equal(f.terminated(),1)
 await assert.rejects(f.session.query('select late;'));f.end()
})
test('oversized response closes the owned backend without returning partial rows',async()=>{
 const f=fixture(),a=f.session.query('select original;'),rejected=assert.rejects(a,{message:'NATIVE_SESSION_UNAVAILABLE'})
 f.reply('x'.repeat(32769));await rejected;assert.equal(f.terminated(),1);f.end()
 const g=fixture(),b=g.session.query('select original;');let settled=false
 const unterminated=assert.rejects(b,{message:'NATIVE_SESSION_UNAVAILABLE'}).then(()=>{settled=true})
 try{
  g.child.stdout.write('x'.repeat(65537));await new Promise(resolve=>setImmediate(resolve))
  assert.equal(settled,true,'unterminated output must be bounded before the watchdog')
  await unterminated;assert.equal(g.terminated(),1)
 }finally{g.end();await unterminated}
})
test('the native watchdog terminates the owned backend at its exact deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const f=fixture(),a=f.session.query('select blocked;'),rejected=assert.rejects(a,{message:'NATIVE_SESSION_UNAVAILABLE'})
 t.mock.timers.tick(29999);assert.equal(f.terminated(),0)
 t.mock.timers.tick(1);await rejected;assert.equal(f.terminated(),1);f.end()
})
test('cancellation terminates only the owned backend and prevents late requests',async()=>{
 const f=fixture(),stop=new AbortController(),a=f.session.query('select original;',stop.signal),rejected=assert.rejects(a,{message:'NATIVE_SESSION_UNAVAILABLE'})
 stop.abort();await rejected;assert.equal(f.terminated(),1);await assert.rejects(f.session.query('select late;'));assert.ok(!f.wire().includes('late'));f.end()
})
test('SQL errors, metacommands and oversized input expose only a closed failure code',async()=>{
 const f=fixture()
 await assert.rejects(f.session.query('\\connect arbitrary_remote'),{message:'NATIVE_SESSION_UNAVAILABLE'})
 await assert.rejects(f.session.query('x'.repeat(65537)),{message:'NATIVE_SESSION_UNAVAILABLE'})
 assert.equal(f.wire(),'')
 const a=f.session.query('select original;'),rejected=assert.rejects(a,{message:'NATIVE_SESSION_UNAVAILABLE'})
 f.child.stderr.write('PRIVATE_SQL_OR_DATABASE_ERROR');await rejected;assert.equal(f.terminated(),1);f.end()
})
