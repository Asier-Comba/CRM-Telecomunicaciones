import {test} from 'node:test'
import assert from 'node:assert/strict'
import {postgresQueryReady} from '../../scripts/platform/postgres-query-ready.mjs'
test('accepting socket without usable application database cannot satisfy actual query readiness',async()=>{
 let queries=0,pauses=0
 const proof=await postgresQueryReady({expected:'16.13',probe:()=>{if(++queries<3)throw new Error('synthetic-private-startup');return '16.13'},pause:async()=>{pauses++}})
 assert.deepEqual(proof,{version:'16.13',query_attempts:3});assert.equal(pauses,2)
 assert.equal(JSON.stringify(proof).includes('private'),false)
})
test('wrong/malformed version fails immediately; unavailable database stays bounded and unproven',async()=>{
 for(const value of ['16.15','17.0','',null,'private-canary'])await assert.rejects(()=>postgresQueryReady({expected:'16.13',probe:()=>value,pause:async()=>assert.fail('wrong version must not retry')}),/PINNED_VERSION_MISMATCH/)
 let probes=0,pauses=0
 await assert.rejects(()=>postgresQueryReady({expected:'16.13',attempts:3,probe:()=>{probes++;throw new Error('private-canary')},pause:async()=>{pauses++}}),/QUERY_NOT_READY/)
 assert.equal(probes,3);assert.equal(pauses,2)
 for(const attempts of [0,61,1.5])await assert.rejects(()=>postgresQueryReady({expected:'16.13',attempts,probe:()=>assert.fail('invalid contract')}),/CONTRACT_INVALID/)
})
