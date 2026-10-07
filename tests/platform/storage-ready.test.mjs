import {test} from 'node:test'
import assert from 'node:assert/strict'
import {storageReady} from '../../scripts/platform/storage-ready.mjs'
test('fresh B read-only readiness tolerates lost old sockets but rejects authorization and hosted targets',async()=>{
 let calls=0
 const transport=async(url,options)=>{assert.equal(options.method,undefined);assert.equal(url,'http://127.0.0.1:54321/storage/v1/bucket');if(++calls===1)throw new TypeError('fetch failed');return new Response('[]')}
 assert.deepEqual(await storageReady('http://127.0.0.1:54321','synthetic',{transport,pause:async()=>{}}),{result:'PASS',attempts:2})
 await assert.rejects(()=>storageReady('http://127.0.0.1:54321','synthetic',{transport:async()=>new Response('{}',{status:401})}),/HTTP_401/)
 await assert.rejects(()=>storageReady('https://project.supabase.co','synthetic'),/LOOPBACK/)
 await assert.rejects(()=>storageReady('http://127.0.0.1:54321','synthetic',{transport:async()=>new Response('{}',{status:503}),pause:async()=>{},attempts:2}),/TIMEOUT/)
})
