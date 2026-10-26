import {test} from 'node:test'
import assert from 'node:assert/strict'
import {documentProbe} from '../../tools/asier_compat62/compatibility.mjs'

// This is an oracle regression test, not an Auth/Storage acceptance result.
function fixture(status,objectExists=true){
  const bytes=Buffer.from('synthetic'),d={version:2,active:{id:'active',path:'synthetic/path'},pendingRetry:{id:'pending'},bytes,call:async()=>({status:200,json:{ticket_id:'ticket'}})}
  const c={users:{ownerA:{token:'synthetic'}},wa:'synthetic',sql:()=>objectExists?'1':'0',check:(ok,name)=>{if(!ok)throw Error(name)},http:async path=>path.includes('/list/')?{status:200,json:[]}:{status,bytes},post:async path=>({status:path.includes('/upload')?409:403,json:{error:path.includes('/upload')?'conflict':'access_denied'}})}
  return {c,d}
}
test('88 refuses to count an infrastructure 500 as a successful read denial',async()=>{
  const {c,d}=fixture(500)
  await assert.rejects(documentProbe(c,d,'88'),/88_direct_read_denied/)
})
test('88 refuses a missing fixture object as proof of read revocation',async()=>{
  const {c,d}=fixture(400,false)
  await assert.rejects(documentProbe(c,d,'88'),/88_direct_read_denied/)
})
test('88 admits only the observed denial for an object that still exists',async()=>{
  const {c,d}=fixture(400)
  const result=await documentProbe(c,d,'88')
  assert.deepEqual(result,{direct:400,proxy:403,same_byte_retry:409,integrity:403,ticket:200,manifest:200})
})
