import test from 'node:test'
import assert from 'node:assert/strict'
import {safeAuthLocation,safeAuthResponse} from '../../tools/asier_auth_recovery/observation.mjs'

test('safe navigation observation retains only closed origin/path/flow and presence booleans',()=>{
 const safe=safeAuthLocation('http://127.0.0.1:3000/auth/callback?code=PRIVATE_CODE#access_token=PRIVATE_ACCESS&refresh_token=PRIVATE_REFRESH&type=invite')
 assert.deepEqual(safe,{origin:'APP_LOOPBACK',path:'/auth/callback',has_query:true,has_hash:true,has_session_tokens:true,has_code:true,has_error:false,flow:'invite'})
 assert.equal(JSON.stringify(safe).includes('PRIVATE_'),false)
})
test('external/invalid paths, query values and arbitrary flows cannot enter the report',()=>{
 for(const value of ['https://PRIVATE_HOST/PRIVATE_PATH?error=PRIVATE_ERROR#type=PRIVATE_FLOW','PRIVATE_INVALID','http://127.0.0.1:3000/PRIVATE_PATH#PRIVATE_HASH']){
  const safe=safeAuthLocation(value);assert.equal(safe.path,'OTHER');assert.equal(JSON.stringify(safe).includes('PRIVATE_'),false)
 }
})
test('response observation accepts only local known Auth operations, status and redacted redirect',()=>{
 assert.equal(safeAuthResponse('https://hosted.invalid/auth/v1/verify',302,'PRIVATE'),null)
 assert.equal(safeAuthResponse('http://127.0.0.1:54321/PRIVATE',200),null)
 const safe=safeAuthResponse('http://127.0.0.1:54321/auth/v1/verify?token=PRIVATE_TOKEN',302,'http://127.0.0.1:3000/auth/callback#error=PRIVATE_ERROR&type=recovery')
 assert.equal(safe.kind,'VERIFY');assert.equal(safe.status,302);assert.equal(safe.redirect.has_error,true);assert.equal(safe.redirect.flow,'recovery');assert.equal(JSON.stringify(safe).includes('PRIVATE_'),false)
 assert.equal(safeAuthResponse('http://127.0.0.1:54321/auth/v1/token',Infinity).status,null)
})
