import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { portAvailable, previewRoot } from './preview-common.mjs'
const port = 3111
assert.ok(await portAvailable(port), 'launch check requires unused loopback3111')
const child = spawn(process.execPath, [resolve(previewRoot,'scripts/preview-setup.mjs')], {
  cwd:previewRoot, shell:false, stdio:['ignore','pipe','pipe','ipc'],
  env:{...process.env,PREVIEW_PORT:String(port)},
})
let output = ''
child.stdout.on('data', data => { output += data.toString() })
child.stderr.on('data', data => { output += data.toString() })
const exited = new Promise(resolveExit => child.once('exit', resolveExit))
try {
  const deadline = Date.now()+110_000
  while (!output.includes('CRM Telecom synthetic preview ready') && Date.now()<deadline && child.exitCode===null) await new Promise(r=>setTimeout(r,250))
  assert.ok(output.includes('CRM Telecom synthetic preview ready'), 'launcher did not report ready; run preview:doctor')
  assert.ok(output.includes(`http://127.0.0.1:${port}/login`))
  const html = await (await fetch(`http://127.0.0.1:${port}/login`)).text()
  assert.match(html,/Ver demo telecom/)
  const reply = await (await fetch(`http://127.0.0.1:${port}/api/assistant/read-preview`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'Qué tengo hoy'})})).json()
  assert.ok(reply.responses.some(r=>r.grounded))
  console.log(`Local setup ready/login/grounded read PASS (${process.platform}; directory with spaces supported).`)
} finally {
  // Windows SIGTERM force-kills a process without JS cleanup; exercise its
  // explicit local IPC stop. POSIX exercises the user's signal path directly.
  if (child.connected && process.platform==='win32') child.send('preview:stop')
  else child.kill('SIGTERM')
  let timer
  const result = await Promise.race([exited, new Promise(resolveTimeout=>{timer=setTimeout(()=>resolveTimeout('timeout'),10_000)})])
  clearTimeout(timer)
  if (result==='timeout') {
    if(process.platform==='win32') spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{shell:false,stdio:'ignore'})
    else child.kill('SIGKILL')
    throw new Error('launcher cleanup timed out')
  }
  assert.ok(await portAvailable(port),'launcher left a child server listening')
  console.log('Child process shutdown and port cleanup PASS.')
}
