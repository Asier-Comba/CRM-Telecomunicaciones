import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {encryptBackup,decryptBackup,verifyBundle,restoreStorage} from '../../scripts/platform/backup.mjs'
import {hash} from '../../scripts/platform/lib.mjs'

const bundle=()=>({version:1,migrations:[],database:Buffer.from('synthetic-db').toString('base64'),database_sha256:hash('synthetic-db'),buckets:[{id:'private',public:false}],objects:[{bucket:'private',name:'synthetic.txt',size:3,sha256:hash('abc'),bytes:Buffer.from('abc').toString('base64')}]})

test('v1 archive accepts its complete authenticated round trip and rejects every shortened tag',()=>{
 const key=randomBytes(32),plain=Buffer.from('synthetic-only'),archive=encryptBackup(plain,key,'synthetic-key'),envelope=JSON.parse(archive)
 assert.deepEqual(decryptBackup(archive,key),plain)
 assert.deepEqual(decryptBackup(encryptBackup(Buffer.alloc(0),key,'synthetic-key'),key),Buffer.alloc(0))
 assert.throws(()=>encryptBackup(plain,key,42),/BACKUP_INPUT_INVALID/)
 for(const length of [4,8,12,13,14,15]){
  const bad={...envelope,tag:Buffer.from(envelope.tag,'base64').subarray(0,length).toString('base64')}
  assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(bad)),key),/BACKUP_AUTHENTICATION_FAILED/)
 }
 key.fill(0)
})

test('v1 archive rejects noncanonical encoding, changed structure and invalid nonce before returning bytes',()=>{
 const key=randomBytes(32),archive=encryptBackup(Buffer.from('synthetic-only'),key,'synthetic-key'),envelope=JSON.parse(archive)
 for(const mutate of [a=>a.header+='!',a=>a.nonce+='!',a=>a.tag+='!',a=>a.body+='!',a=>a.nonce=Buffer.alloc(16).toString('base64'),a=>delete a.body,a=>a.extra=true,a=>a.body=42]){
  const bad=structuredClone(envelope);mutate(bad)
  assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(bad)),key),/BACKUP_AUTHENTICATION_FAILED/)
 }
 assert.throws(()=>decryptBackup(archive.subarray(0,archive.length-1),key),/BACKUP_AUTHENTICATION_FAILED/)
 key.fill(0)
})

test('ambiguous buckets and corrupt byte encodings are rejected before any storage provider call',async()=>{
 assert.equal(verifyBundle(bundle()),true)
 const provider=new Proxy({}, {get(){throw new Error('PROVIDER_MUST_NOT_BE_CALLED')}})
 for(const mutate of [b=>b.buckets.push({...b.buckets[0]}),b=>b.database+='!',b=>b.objects[0].bytes+='!',b=>b.buckets[0].id='',b=>b.database=42,b=>b.objects[0].bytes=42]){
  const bad=bundle();mutate(bad)
  await assert.rejects(()=>restoreStorage(provider,bad),e=>!e.message.includes('PROVIDER_MUST_NOT_BE_CALLED'))
 }
 const empty=bundle();empty.objects[0]={...empty.objects[0],size:0,sha256:hash(Buffer.alloc(0)),bytes:''}
 assert.equal(verifyBundle(empty),true,'legitimate zero-byte storage object remains valid')
})
