import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:net'
import {probeHostCanary,gatewayTarget} from './host-probe.mjs'
test('connected silent peer must never count as denied',async()=>{
 const sockets=new Set(),server=createServer(s=>{sockets.add(s);s.on('close',()=>sockets.delete(s))})
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 try{
 const input={host:'127.0.0.1',port:server.address().port,timeout:40}
 const negative=await probeHostCanary({...input,mode:'negative'})
 assert.equal(negative.connected,true);assert.equal(negative.status,'CONNECTED')
 const positive=await probeHostCanary({...input,mode:'positive'})
 assert.equal(positive.connected,true);assert.equal(positive.status,'PROBE_ERROR')
 }finally{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r))}
})
test('invalid probe input is an error, never evidence of denial',()=>{for(const host of ['', 'invalid-host'])assert.throws(()=>probeHostCanary({host,port:3000,mode:'negative'}),/PROBE_INPUT_INVALID/)})
test('unassigned gateway is explicit absence, malformed metadata never becomes a denial',()=>{assert.equal(gatewayTarget(undefined),'ABSENT');assert.equal(gatewayTarget(''),'ABSENT');assert.equal(gatewayTarget('192.0.2.1'),'IPV4');for(const v of [null,[],{},'host.invalid','::1'])assert.throws(()=>gatewayTarget(v),/GATEWAY_TARGET_INVALID/)})
