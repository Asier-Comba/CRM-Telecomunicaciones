import test from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { assistantServerDiagnostic, observeAssistantServerDiagnostics, assistantUpstreamDiagnostic } from '../../scripts/security/supabase-local/assistant-server-diagnostics.mjs'

test('assistant server diagnostics discard credentials, payloads and unknown errors', () => {
  const secret = 'private-token-and-conversation@example.invalid'
  assert.equal(assistantServerDiagnostic(secret), null)
  const report = {}, stdout = new PassThrough(), stderr = new PassThrough()
  observeAssistantServerDiagnostics({ stdout, stderr }, report)
  stderr.write('Cannot find mo'); stderr.write('dule ' + secret + '\n')
  stdout.write('GET /assistant?customer=' + secret + ' 500\n')
  for (let i = 0; i < 40; i++) stderr.write('TypeError: ' + secret + '\n')
  assert.equal(report.assistant_server_diagnostics.length, 30)
  assert.equal(report.assistant_server_diagnostics[0].category, 'MODULE_RESOLUTION_FAILED')
  assert.ok(!JSON.stringify(report).includes(secret))
  stdout.end(); stderr.end()
})

test('upstream refusal classification never exports raw JSON/HTML or arbitrary error codes', async () => {
  const secret = 'private-token-and-conversation@example.invalid'
  for (const [type, body] of [['text/html', '<html>TypeError: ' + secret + '</html>'], ['application/json', JSON.stringify({ ok: false, error: secret, cookie: secret })]]) {
    const diagnostic = await assistantUpstreamDiagnostic({ headers: () => ({ 'content-type': type, authorization: secret }), body: async () => Buffer.from(body) })
    assert.equal(diagnostic.body_available, true)
    assert.equal(diagnostic.application_error, null)
    assert.ok(!JSON.stringify(diagnostic).includes(secret))
  }
  const valid = await assistantUpstreamDiagnostic({ headers: () => ({ 'content-type': 'application/json', 'cache-control': 'no-store' }), body: async () => Buffer.from('{"ok":false,"error":"unavailable"}') })
  assert.equal(valid.application_error, 'unavailable')
  const missing = await assistantUpstreamDiagnostic({ headers: () => ({}), body: async () => { throw Error(secret) } })
  assert.equal(missing.body_available, false)
  assert.ok(!JSON.stringify(missing).includes(secret))
})

test('syntax refusals distinguish closed JSON module and regexp categories without exporting source material',async()=>{
 const secret='private-token-and-conversation@example.invalid'
 for(const [message,expected] of [
  ['SyntaxError: Unexpected end of JSON input','SERVER_SYNTAX_JSON_INPUT'],
  ['SyntaxError: '+secret+' is not valid JSON','SERVER_SYNTAX_JSON_INPUT'],
  ["SyntaxError: Unexpected token 'export' "+secret,'SERVER_SYNTAX_MODULE_FORMAT'],
  ['SyntaxError: Cannot use import statement outside a module '+secret,'SERVER_SYNTAX_MODULE_FORMAT'],
  ['SyntaxError: Invalid regular expression '+secret,'SERVER_SYNTAX_REGEXP'],
  ['SyntaxError: Unexpected token '+secret,'SERVER_SYNTAX_ERROR'],
 ]){
  assert.equal(assistantServerDiagnostic(message),expected)
  const diagnostic=await assistantUpstreamDiagnostic({headers:()=>({'content-type':'text/html'}),body:async()=>Buffer.from('<html>'+message+'</html>')})
  assert.equal(diagnostic.error_category,expected);assert.ok(!JSON.stringify(diagnostic).includes(secret))
 }
 assert.equal(assistantServerDiagnostic('arbitrary syntax '+secret),null)
})
