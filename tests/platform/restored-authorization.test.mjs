import {test} from 'node:test'
import assert from 'node:assert/strict'
import {verifyRestoredPrivateResponses as verify} from '../../scripts/platform/restored-authorization.mjs'
const denied=()=>({owner:false,storage:{status:400,json:{message:'Object not found'}},assistant:{status:403,json:{code:'42501'}}})
test('restored positive owner and exact private denial responses are independently required',()=>{
 assert.equal(verify(denied()).storage,'DENIED')
 assert.equal(verify({...denied(),storage:{status:404,json:{message:'Object not found'}}}).storage,'DENIED')
 assert.equal(verify({...denied(),owner:true,storage:{status:200}}).storage,'AUTHORIZED')
 assert.throws(()=>verify({...denied(),owner:true}),/OWNER_NOT_PROVEN/)
 assert.throws(()=>verify({...denied(),owner:false,storage:{status:200}}),/DENIAL_NOT_PROVEN/)
})
test('server, authentication, route and malformed responses cannot pass recovery authorization',()=>{
 for(const status of [0,200,204,301,401,403,405,408,429,500,502,503])assert.throws(()=>verify({...denied(),storage:{status,json:{message:'Object not found'}}}),/STORAGE_DENIAL_NOT_PROVEN/)
 for(const storage of [null,{status:400},{status:400,json:{message:'private-canary'}},{status:404,json:{message:'Route not found'}}])assert.throws(()=>verify({...denied(),storage}),/STORAGE_DENIAL_NOT_PROVEN/)
 for(const assistant of [null,{status:200,json:[]},{status:401,json:{code:'42501'}},{status:403,json:{}},{status:404,json:{code:'PGRST205'}},{status:503,json:{code:'42501'}}])assert.throws(()=>verify({...denied(),assistant}),/ASSISTANT_DENIAL_NOT_PROVEN/)
 const safe=verify({...denied(),storage:{...denied().storage,json:{message:'Object not found',detail:'private-canary'}},assistant:{status:403,json:{code:'42501',details:'private-canary'}}})
 assert.equal(JSON.stringify(safe).includes('private-canary'),false)
})
