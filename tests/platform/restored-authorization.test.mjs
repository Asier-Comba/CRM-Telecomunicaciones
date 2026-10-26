import {test} from 'node:test'
import assert from 'node:assert/strict'
import {verifyRestoredPrivateResponses as verify,verifyRestoredRpcDenial as deniedRpc} from '../../scripts/platform/restored-authorization.mjs'
const denied=()=>({owner:false,storage:{status:400,json:{message:'Object not found'}},assistant:{status:403,json:{code:'42501'}}})
test('restored positive owner and exact private denial responses are independently required',()=>{
 assert.equal(verify(denied()).storage,'DENIED')
 assert.equal(verify({...denied(),storage:{status:404,json:{message:'Object not found'}}}).storage,'DENIED')
 assert.equal(verify({...denied(),owner:true,storage:{status:200}}).storage,'AUTHORIZED')
 assert.throws(()=>verify({...denied(),owner:true}),/OWNER_NOT_PROVEN/)
 assert.throws(()=>verify({...denied(),owner:false,storage:{status:200}}),/DENIAL_NOT_PROVEN/)
})
test('restored RPC denial requires real authenticated permission denial and emits no response detail',()=>{
 assert.equal(deniedRpc({status:403,json:{code:'42501',message:'private-canary'}}).status,'PASS')
 assert.equal(JSON.stringify(deniedRpc({status:403,json:{code:'42501',details:'private-canary'}})).includes('private-canary'),false)
 for(const status of [0,200,400,401,404,429,500,503])assert.throws(()=>deniedRpc({status,json:{code:'42501'}}),/RPC_DENIAL_NOT_PROVEN/)
 for(const json of [null,{},[],{code:'P0002'},{code:'PGRST205'}])assert.throws(()=>deniedRpc({status:403,json}),/RPC_DENIAL_NOT_PROVEN/)
})
test('server, authentication, route and malformed responses cannot pass recovery authorization',()=>{
 for(const status of [0,200,204,301,401,403,405,408,429,500,502,503])assert.throws(()=>verify({...denied(),storage:{status,json:{message:'Object not found'}}}),/STORAGE_DENIAL_NOT_PROVEN/)
 for(const storage of [null,{status:400},{status:400,json:{message:'private-canary'}},{status:404,json:{message:'Route not found'}}])assert.throws(()=>verify({...denied(),storage}),/STORAGE_DENIAL_NOT_PROVEN/)
 for(const assistant of [null,{status:200,json:[]},{status:401,json:{code:'42501'}},{status:403,json:{}},{status:404,json:{code:'PGRST205'}},{status:503,json:{code:'42501'}}])assert.throws(()=>verify({...denied(),assistant}),/ASSISTANT_DENIAL_NOT_PROVEN/)
 const safe=verify({...denied(),storage:{...denied().storage,json:{message:'Object not found',detail:'private-canary'}},assistant:{status:403,json:{code:'42501',details:'private-canary'}}})
 assert.equal(JSON.stringify(safe).includes('private-canary'),false)
})
test('storage contract is read from the checkout migrations, not from the restored database',async()=>{
 const {restoredStorageContract:c}=await import('../../scripts/platform/restored-authorization.mjs')
 assert.equal(c([{version:'20261019180534'}]),'87')
 assert.equal(c([{version:'20261019180534'},{version:'20261021090000'}]),'88')
 for(const bad of [null,undefined,{},'88'])assert.throws(()=>c(bad),/CONTRACT_UNKNOWN/)
 assert.throws(()=>verify({...denied(),contract:'89'}),/CONTRACT_UNKNOWN/)
})
test('profile 87 is unchanged: the owner direct read is still required',()=>{
 assert.equal(verify({...denied(),contract:'87',owner:true,storage:{status:200}}).storage,'AUTHORIZED')
 assert.throws(()=>verify({...denied(),contract:'87',owner:true}),/STORAGE_OWNER_NOT_PROVEN/)
 assert.throws(()=>verify({...denied(),contract:'87',storage:{status:200}}),/DENIAL_NOT_PROVEN/)
})
test('profile 88: every user JWT is denied directly and the owner needs the authorized server read',()=>{
 const ok={manifest:'PASS',bytes:'MATCH'}
 const owner=verify({...denied(),contract:'88',owner:true,serverRead:ok})
 assert.deepEqual([owner.storage,owner.storage_direct],['AUTHORIZED_SERVER_ONLY','DENIED'])
 assert.equal(verify({...denied(),contract:'88'}).storage,'DENIED')
 // A restored owner that can still read bytes directly is a failed restore under 88.
 assert.throws(()=>verify({...denied(),contract:'88',owner:true,storage:{status:200},serverRead:ok}),/OWNER_DIRECT_READ_NOT_CLOSED/)
 assert.throws(()=>verify({...denied(),contract:'88',storage:{status:200}}),/DENIAL_NOT_PROVEN/)
 for(const serverRead of [undefined,null,{},{manifest:'PASS'},{bytes:'MATCH'},{manifest:'PASS',bytes:'MISMATCH'},{manifest:'DENIED',bytes:'MATCH'}])
  assert.throws(()=>verify({...denied(),contract:'88',owner:true,serverRead}),/SERVER_READ_NOT_PROVEN/)
 // The server read never substitutes for a denial: non-owners with a server read still need the direct denial.
 assert.throws(()=>verify({...denied(),contract:'88',storage:{status:200},serverRead:ok}),/DENIAL_NOT_PROVEN/)
 assert.equal(JSON.stringify(owner).includes('private-canary'),false)
})
