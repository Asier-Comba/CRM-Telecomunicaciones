import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const source=readFileSync(new URL('../../scripts/security/supabase-local/product-browser-acceptance.mjs',import.meta.url),'utf8')
const start=source.indexOf("await check('calendar_real_cursor_next_previous',async()=>{")
const end=source.indexOf("await check('dashboard_operational_scope_period'",start)
assert.ok(start>=0&&end>start)
const callback=source.slice(start,end)
for(const failureAt of [1,2])test(`the original calendar response failure at page${failureAt} reaches the owned check and fixture cleanup`,()=>{
  // Execute the actual callback in a separate Node process. Early rejection
  // must never escape its owning check while the original UI action is pending.
  // Transport/SQL/UI are synthetic; this is no Auth/DB/browser acceptance.
  const code=`let cleaned=false,caught=false,waits=0;const origin='http://synthetic.invalid',wa='workspace',id='customer',day='2026-10-13',users={memberA:{id:'actor'}};const sql=s=>{if(s.startsWith('delete'))cleaned=true};const pause=()=>new Promise(r=>setTimeout(r,20));const page={goto:async()=>{},getByRole:kind=>({click:kind==='tab'?async()=>{}:pause}),getByLabel:()=>({selectOption:pause}),waitForResponse:()=>{waits++;return waits===${failureAt}?new Promise((_r,no)=>setTimeout(()=>no(Error('synthetic_response_timeout')),1)):Promise.resolve({json:async()=>({data:{items:Array.from({length:100},(_,id)=>({id,kind:'task'})),next:{after_id:'cursor'}}})})}};const check=async(_name,fn)=>{try{await fn()}catch(e){caught=e.message==='synthetic_response_timeout'}};${callback};console.log(JSON.stringify({caught,cleaned,waits}));`
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:10000})
  assert.equal(result.error,undefined);assert.equal(result.signal,null)
  assert.equal(result.status,0)
  assert.deepEqual(JSON.parse(result.stdout.trim()),{caught:true,cleaned:true,waits:failureAt})
})
