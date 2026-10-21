import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { Script } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

// Executes the actual handler and NextResponse. Only createUserServerClient is
// injected: no real Auth, RPC, DB, permission, transaction or cloud assertion.
const require = createRequire(import.meta.url)
const source = await readFile('src/app/api/onboarding/workspace/route.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const row = { id: '50000000-0000-4000-8000-000000000001', name: 'Empresa sintética', slug: 'empresa-sintetica', role: 'owner', created: true }
function handler({ configured = true, authenticated = true, result = { data: row, error: null } } = {}) {
  const calls = []
  const client = {
    auth: { async getUser() { calls.push({ operation: 'auth.getUser' }); return { data: { user: authenticated ? { id: 'synthetic-user' } : null }, error: null } } },
    async rpc(name, input) { calls.push({ operation: name, input }); return result },
  }
  const module = { exports: {} }
  const injectedRequire = name => {
    if (name === 'next/server') return require('next/server')
    if (name === '@/lib/server/supabase-user') return { createUserServerClient: async () => configured ? client : null }
    throw Error(`UNEXPECTED_HANDLER_DEPENDENCY:${name}`)
  }
  new Script(`(function(require,module,exports){${compiled}\n})`, { filename: 'actual-onboarding-route.cjs' }).runInThisContext()(injectedRequire, module, module.exports)
  return { POST: module.exports.POST, calls }
}
const request = () => new Request('http://127.0.0.1/api/onboarding/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '  Empresa sintética  ' }) })
function evidence(t, response, calls) {
  t.diagnostic(JSON.stringify({ case: t.name, status: response.status, operations: calls.map(c => c.operation), scope: 'ACTUAL_HANDLER_CONTROLLED_AUTH_RPC_NOT_DB_CLOUD' }))
}
for (const created of [true, false]) test(`onboarding route accepts canonical ${created ? 'new' : 'existing'} result`, async t => {
  const expected = { ...row, created, ...(created ? {} : { name: 'Empresa anterior', slug: 'empresa-anterior', role: 'viewer' }) }
  const api = handler({ result: { data: [expected], error: null } }), response = await api.POST(request())
  evidence(t, response, api.calls)
  assert.equal(response.status, created ? 201 : 200)
  assert.deepEqual(await response.json(), { workspace: expected })
  assert.deepEqual(api.calls, [{ operation: 'auth.getUser' }, { operation: 'provision_workspace', input: { p_name: 'Empresa sintética', p_slug: 'empresa-sintetica' } }])
})
for (const configured of [false, true]) test(`onboarding route ${configured ? 'unauthenticated' : 'unconfigured'} never invokes provisioning`, async t => {
  const api = handler({ configured, authenticated: false }), response = await api.POST(request())
  evidence(t, response, api.calls)
  assert.equal(response.status, configured ? 401 : 503)
  assert.deepEqual(api.calls, configured ? [{ operation: 'auth.getUser' }] : [])
  assert.equal((await response.json()).code, configured ? 'unauthenticated' : 'supabase_unconfigured')
})
for (const [code, message, status, publicCode] of [['23505', 'synthetic duplicate internal detail', 409, 'slug_taken'], ['42501', 'workspace suspended: synthetic internal detail', 403, 'workspace_suspended']]) test(`onboarding route maps ${publicCode} without internal detail`, async t => {
  const api = handler({ result: { data: null, error: { code, message } } }), response = await api.POST(request())
  evidence(t, response, api.calls)
  assert.equal(response.status, status)
  const body = await response.json(); assert.equal(body.code, publicCode)
  assert.ok(!JSON.stringify(body).includes('synthetic internal detail'))
  assert.deepEqual(api.calls.map(c => c.operation), ['auth.getUser', 'provision_workspace'])
})
for (const [label, data] of [['null', null], ['empty-array', []], ['invalid-id', [{ ...row, id: 'not-an-id' }]]]) test(`onboarding route must not acknowledge unconfirmed ${label} RPC result`, async t => {
  const api = handler({ result: { data, error: null } }), response = await api.POST(request())
  evidence(t, response, api.calls)
  // Owner decision required for the exact safe status/error and recovery protocol.
  // The invariant is simply: no successful acknowledgement without a valid row.
  assert.equal(response.ok, false, `UNCONFIRMED_RPC_RESULT_ACKNOWLEDGED_${response.status}`)
  assert.deepEqual(api.calls.map(c => c.operation), ['auth.getUser', 'provision_workspace'])
})
