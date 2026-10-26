import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {responseForAction} from '../../tools/asier_compat62/response-action.mjs'

for(const synchronous of [false,true])test('failed '+(synchronous?'synchronous':'asynchronous')+' action handles later waiter rejection',()=>{
  const helperUrl=new URL('../../tools/asier_compat62/response-action.mjs',import.meta.url).href
  const result=spawnSync(process.execPath,['--input-type=module','-e',`
    import {responseForAction} from ${JSON.stringify(helperUrl)};
    let unhandled=0,rejectWait;process.on('unhandledRejection',()=>unhandled++);
    const waiting=new Promise((_,reject)=>{rejectWait=reject});
    try{await responseForAction(()=>waiting,${synchronous?'':'async '}()=>{throw Error('ACTION_FAILED')})}catch{}
    rejectWait(Error('PAGE_CLOSED'));await new Promise(r=>setTimeout(r,30));
    process.stdout.write(String(unhandled));process.exitCode=unhandled?1:0;
  `],{encoding:'utf8',timeout:5000})
  assert.equal(result.status,0,'no orphan rejection after the action fails')
  assert.equal(result.stdout,'0')
})
test('registers observation before action and returns its exact response',async()=>{
  const order=[],response={status:200}
  assert.equal(await responseForAction(()=>{order.push('observe');return Promise.resolve(response)},async()=>{order.push('action')}),response)
  assert.deepEqual(order,['observe','action'])
})
