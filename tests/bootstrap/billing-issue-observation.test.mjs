import test from 'node:test'
import assert from 'node:assert/strict'
import {observeInvoiceIssue} from '../../scripts/security/supabase-local/billing-issue-observation.mjs'
const id='10000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000001',invoice='30000000-0000-4000-8000-000000000001',command='40000000-0000-4000-8000-000000000001'
const context={origin:'http://127.0.0.1:3109',workspaceId:id,actorId:actor,input:{id:invoice,command_id:command,expected_version:1}}
const effect={ledger_rows:1,receipt_rows:1,audit_rows:1,entity_rows:1,entity_version:2,entity_issued:true,receipt_audit_entity_coherent:true}
function inCi(action){const prior=process.env.GITHUB_ACTIONS;process.env.GITHUB_ACTIONS='true';try{return action()}finally{if(prior===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=prior}}
test('observation refuses hosted origins and invalid identities before touching SQL',()=>inCi(()=>{
 const sql=()=>{throw Error('SQL_MUST_NOT_RUN')}
 assert.equal(observeInvoiceIssue({...context,sql,origin:'https://staging.invalid'}).observation,'NOT_RUN_OUTSIDE_DISPOSABLE_CI')
 for(const patch of [{workspaceId:"x';delete from invoice;--"},{actorId:null},{input:{...context.input,id:'foreign'}},{input:{...context.input,command_id:'not-uuid'}},{input:{...context.input,expected_version:1.5}}])assert.equal(observeInvoiceIssue({...context,sql,...patch}).observation,'NOT_RUN_INVALID_IDENTITY')
}))
test('observation cannot query outside the existing CI environment',()=>{
 const prior=process.env.GITHUB_ACTIONS;delete process.env.GITHUB_ACTIONS
 try{assert.deepEqual(observeInvoiceIssue({...context,sql:()=>{throw Error('SQL_MUST_NOT_RUN')}}),{observation:'NOT_RUN_OUTSIDE_DISPOSABLE_CI'})}finally{if(prior!==undefined)process.env.GITHUB_ACTIONS=prior}
})
test('read-only output correlates the command without exposing identifiers or untrusted fields',()=>inCi(()=>{
 let statement
 const result=observeInvoiceIssue({...context,sql:q=>{statement=q;return JSON.stringify({...effect,credential:'NEVER_REPORT',receipt:{profile:'NEVER_REPORT'}})}})
 assert.match(statement,/^with invoice as/);assert.doesNotMatch(statement,/\b(insert|update|delete|alter|create|drop|truncate|grant|revoke|call)\b/i)
 for(const value of [id,actor,invoice,command])assert.ok(statement.includes(value))
 assert.equal(result.observation,'READ_ONLY');assert.equal(result.receipt_audit_entity_coherent,true);assert.equal(result.entity_version,2);assert.match(result.command_fingerprint,/^[a-f0-9]{64}$/)
 const serialized=JSON.stringify(result);for(const value of [id,actor,invoice,command,'NEVER_REPORT'])assert.ok(!serialized.includes(value))
}))
test('absence, duplicate counts and incoherent receipt remain observations rather than a fabricated success',()=>inCi(()=>{
 for(const fields of [{...effect,ledger_rows:0,receipt_rows:0,audit_rows:0,entity_version:1,entity_issued:false,receipt_audit_entity_coherent:false},{...effect,ledger_rows:2,receipt_audit_entity_coherent:false}]){
  const result=observeInvoiceIssue({...context,sql:()=>JSON.stringify(fields)});assert.equal(result.observation,'READ_ONLY');assert.equal(result.receipt_audit_entity_coherent,false);assert.equal(result.ledger_rows,fields.ledger_rows)
 }
}))
test('read failures never print SQL errors or silently assert an effect',()=>inCi(()=>{
 assert.deepEqual(observeInvoiceIssue({...context,sql:()=>{throw Error('secret diagnostic error')}}),{observation:'UNAVAILABLE_READ_FAILED'})
 assert.deepEqual(observeInvoiceIssue({...context,sql:()=>JSON.stringify({...effect,entity_version:'untrusted'})}),{observation:'UNAVAILABLE_INVALID_RESULT'})
}))
