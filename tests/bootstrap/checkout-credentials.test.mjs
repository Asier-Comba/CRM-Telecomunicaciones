import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {checkCheckouts,checkWorkflowDirectory} from '../../scripts/ci/check-checkout-credentials.mjs'
const pin='a'.repeat(40)
const step=guard=>`      - name: Checkout\n        uses: actions/checkout@${pin}\n        with:\n          ${guard}\n`
test('every checkout is bound to its own explicit false input',()=>{
 assert.equal(checkCheckouts(step('persist-credentials: false')+step('persist-credentials: false')),2)
 assert.equal(checkCheckouts(`      - uses: actions/checkout@${pin}\n        with:\n          ref: branch\n          persist-credentials: 'false' # explicit\n`),1)
 assert.equal(checkCheckouts(step('persist-credentials: "false"')),1)
})
test('an orphan false in another step cannot compensate for an unsafe checkout',()=>{
 const compensating=step('ref: branch')+`      - name: unrelated\n        uses: other/action@${pin}\n        with:\n          persist-credentials: false\n`
 assert.equal((compensating.match(/uses: actions\/checkout@/g)||[]).length,(compensating.match(/persist-credentials: false/g)||[]).length)
 assert.throws(()=>checkCheckouts(compensating),/PRIVATE_CREDENTIAL_GUARD/)
})
test('unsafe, absent, duplicate, inline and ambiguous inputs fail closed',()=>{
 for(const input of ['ref: branch','persist-credentials: true','persist-credentials: ${{ secrets.VALUE }}','persist-credentials: false\n          persist-credentials: true','nested:\n            persist-credentials: false'])assert.throws(()=>checkCheckouts(step(input)),/PRIVATE_CREDENTIAL_GUARD/)
 assert.equal(checkCheckouts(step('persist-credentials: false').replace('with:\n          persist-credentials: false','with: {persist-credentials: false, fetch-depth: 0}')),1)
 assert.throws(()=>checkCheckouts(step('persist-credentials: false').replace('with:\n          persist-credentials: false','with: {persist-credentials: false, persist-credentials: true}')),/INLINE_WITH/)
 assert.throws(()=>checkCheckouts(step('persist-credentials: false').replace('with:\n          persist-credentials: false','with: {nested: {persist-credentials: false}}')),/BLOCK_WITH/)
 assert.throws(()=>checkCheckouts(step('persist-credentials: false')+'        with:\n          persist-credentials: false\n'),/BLOCK_WITH/)
})
test('run/env strings and comments are not checkout input guards',()=>{
 for(const suffix of ['        run: |\n          persist-credentials: false\n','        env:\n          persist-credentials: false\n','          # persist-credentials: false\n'])assert.throws(()=>checkCheckouts(step('ref: branch')+suffix),/PRIVATE_CREDENTIAL_GUARD/)
 assert.equal(checkCheckouts('      # uses: actions/checkout@'+pin+'\n'),0)
})
test('quoted action and immutable pin are checked; floating refs rejected',()=>{
 assert.equal(checkCheckouts(step('persist-credentials: false').replace(`actions/checkout@${pin}`,`"actions/checkout@${pin}"`)),1)
 for(const ref of ['v7','main','1234'])assert.throws(()=>checkCheckouts(step('persist-credentials: false').replace(pin,ref)),/IMMUTABLE_REF/)
})
test('multiple workflow files require each checkout, not arithmetic over grep lines',()=>{
 const dir=mkdtempSync(join(tmpdir(),'checkout-guard-'))
 try{
  writeFileSync(join(dir,'first.yml'),step('persist-credentials: false'))
  writeFileSync(join(dir,'second.yaml'),step('ref: branch'))
  assert.throws(()=>checkWorkflowDirectory(dir),/PRIVATE_CREDENTIAL_GUARD/)
  writeFileSync(join(dir,'second.yaml'),step('persist-credentials: false'))
  assert.deepEqual(checkWorkflowDirectory(dir),{status:'PASS',workflow_files:2,checkout_steps:2,values_included:false})
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('actual repository workflows satisfy per-checkout credential binding',()=>{
 const result=checkWorkflowDirectory('.github/workflows')
 assert.equal(result.status,'PASS');assert.ok(result.checkout_steps>2)
})
