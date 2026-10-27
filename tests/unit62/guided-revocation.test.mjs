import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assertGuidedRevocationProof} from '../../tools/asier_compat62/guided-revocation.mjs'

const valid=()=>({status:403,denialCode:'access_denied',correlated:true,requests:1,customerPresent:true,suspended:true,jwtValid:true,unexpired:true,before:{invoices:7,lines:9,customer:0},after:{invoices:7,lines:9,customer:0}})
test('only a correlated real denial with live identity and zero invoice/line effects can satisfy the oracle',()=>{
  const proof=valid();proof.private='DO_NOT_PUBLISH_SYNTHETIC_TOKEN_BODY_ID'
  const result=assertGuidedRevocationProof(proof)
  assert.deepEqual(result,{contract:'commercial.guided-revocation.v1',result:'PASS',status:403,requests:1,jwt_valid:true,invoice_delta:0,line_delta:0})
  assert.ok(!JSON.stringify(result).includes(proof.private))
})
for(const status of [200,401,404,409,500,503,undefined])test(`HTTP ${status} cannot masquerade as authorization denial`,()=>{
  assert.throws(()=>assertGuidedRevocationProof({...valid(),status}),/EXPECTED_403/)
})
for(const key of ['correlated','customerPresent','suspended','jwtValid','unexpired'])test(`a 403 without proven ${key} is not acceptance`,()=>{
  assert.throws(()=>assertGuidedRevocationProof({...valid(),[key]:false}))
})
test('a 403 with an unrelated or unavailable error envelope is not membership denial',()=>{
  for(const denialCode of [undefined,'validation','internal_safe','forbidden_origin'])assert.throws(()=>assertGuidedRevocationProof({...valid(),denialCode}),/DENIAL_ENVELOPE/)
})
test('missing or repeated command, absent counters, and insertions in either tenant must fail',()=>{
  for(const requests of [0,2])assert.throws(()=>assertGuidedRevocationProof({...valid(),requests}),/CORRELATION/)
  for(const after of [null,{invoices:7,lines:NaN,customer:0},{invoices:7,lines:9,customer:1},{invoices:8,lines:9,customer:0},{invoices:7,lines:10,customer:0}])assert.throws(()=>assertGuidedRevocationProof({...valid(),after}))
  const p=valid();p.before.customer=1;assert.throws(()=>assertGuidedRevocationProof(p),/UNEXPECTED_EFFECT/)
})
