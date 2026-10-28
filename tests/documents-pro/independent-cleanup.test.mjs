import test from 'node:test'
import assert from 'node:assert/strict'
import {independentCleanup} from '../../tools/asier_documents_global/independent-cleanup.mjs'
test('route-removal rejection cannot prevent role restoration or verification and remains a failure',async()=>{
 let role='viewer',verified=false,finalCleanup=false
 const result=await independentCleanup([async()=>{throw Error('SYNTHETIC_UNROUTE_FAILURE')},()=>{role='owner'},()=>{assert.equal(role,'owner');verified=true},()=>{finalCleanup=true}])
 assert.equal(role,'owner');assert.equal(verified,true);assert.equal(finalCleanup,true);assert.equal(result.failed,true)
})
test('restoration failure still attempts verification and browser cleanup without a false success',async()=>{
 let verified=false,closed=false
 const result=await independentCleanup([()=>{throw Error('SYNTHETIC_RESTORE_FAILURE')},()=>{verified=true;throw Error('SYNTHETIC_VERIFY_FAILURE')},()=>{closed=true}])
 assert.equal(verified,true);assert.equal(closed,true);assert.equal(result.failed,true)
})
