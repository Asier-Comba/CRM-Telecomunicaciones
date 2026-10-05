import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

// Run after npm run build. The explicit demo flag must not reopen production.
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3108'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_DEMO_DATA: 'true' },
})
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch('http://127.0.0.1:3108/login')).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'production server must start')
  const response = await fetch('http://127.0.0.1:3108/api/assistant/read-preview', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Qué tengo hoy' }),
  })
  const body = await response.json()
  assert.equal(body.responses[0].status, 'POLICY_BLOCK')
  assert.equal(body.responses[0].grounded, false)
  assert.deepEqual(body.responses[0].blocks, {})
  for (const path of ['/login', '/dashboard', '/clients', '/calendar', '/opportunities', '/clients/cust_demo_norte_0001', '/portfolio', '/assistant', '/facturacion', '/settings', '/inbox', '/automations', '/documents']) {
    const html = await (await fetch(`http://127.0.0.1:3108${path}`)).text()
    assert.doesNotMatch(html, /Empresa Norte Telecom SL|Ver demo telecom/, path)
  }
  console.log('Production fixture route, SSR data and demo entry: CLOSED')
} finally { child.kill('SIGTERM') }
