import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {encryptBackup,decryptBackup,verifyBundle,captureStorage,restoreStorage,storageTargetGuard} from '../../scripts/platform/backup.mjs'
import {hash} from '../../scripts/platform/lib.mjs'
const bundle=()=>({version:1,migrations:[],database:Buffer.from('synthetic-dump').toString('base64'),database_sha256:hash('synthetic-dump'),buckets:[{id:'private',public:false,file_size_limit:100,allowed_mime_types:null}],objects:[{bucket:'private',name:'nested/file.pdf',size:3,sha256:hash('abc'),bytes:Buffer.from('abc').toString('base64'),content_type:'application/pdf',cache_control:'3600'}]})
test('authenticated encryption rejects corruption, wrong key and header tampering',()=>{
 const key=randomBytes(32),bytes=Buffer.from(JSON.stringify(bundle())),archive=encryptBackup(bytes,key,'test-key')
 assert.deepEqual(decryptBackup(archive,key),bytes);assert.equal(archive.includes('synthetic-dump'),false)
 assert.notDeepEqual(encryptBackup(bytes,key,'test-key'),archive)
 assert.throws(()=>decryptBackup(archive,randomBytes(32)),/AUTHENTICATION/)
 const bad=JSON.parse(archive);bad.header=Buffer.from(JSON.stringify({version:1,key_id:'other-key',algorithm:'AES-256-GCM'})).toString('base64')
 assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(bad)),key),/AUTHENTICATION/)
 bad.header=JSON.parse(archive).header;bad.body=Buffer.from('tampered').toString('base64')
 assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(bad)),key),/AUTHENTICATION/)
})
test('recovery rejects missing bytes, duplicate objects, path traversal and public buckets',()=>{
 const b=bundle();assert.equal(verifyBundle(b),true)
 for(const mutate of [x=>x.objects[0].bytes='',x=>x.objects.push({...x.objects[0]}),x=>x.objects[0].name='../bad',x=>x.buckets[0].public=true,x=>x.database='']){const v=bundle();mutate(v);assert.throws(()=>verifyBundle(v))}
 assert.throws(()=>storageTargetGuard('https://project.supabase.co'),/LOOPBACK/)
})
test('nested inventory and byte+metadata restore, missing download fails closed',async()=>{
 const b=bundle(),saved=new Map()
 const storage={listBuckets:async()=>({data:b.buckets}),getBucket:async()=>({data:b.buckets[0]}),from:()=>({list:async(prefix)=>({data:prefix==='nested'?[{id:'x',name:'file.pdf',metadata:{mimetype:'application/pdf',cacheControl:'3600'}}]:[{id:null,name:'nested'}]}),download:async(name)=>({data:new Blob([saved.get(name)??'abc'],{type:'application/pdf'})}),upload:async(name,bytes)=>{saved.set(name,bytes);return {error:null}}})}
 assert.equal((await captureStorage(storage)).objects.length,1)
 assert.deepEqual(await restoreStorage(storage,b),{objects:1,hashes:'PASS',metadata:'PASS'})
 storage.from=()=>({list:async()=>({error:'unavailable'})});await assert.rejects(()=>captureStorage(storage),/OBJECT_LIST_FAILED/)
})
