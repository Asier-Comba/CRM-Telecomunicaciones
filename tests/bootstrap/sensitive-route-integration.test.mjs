import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('n8n status authenticates a workspace manager before network access', async () => {
  const source = await read('src/app/api/automations/n8n/status/route.ts')
  assert.ok(source.indexOf('resolveCaller(req)') < source.indexOf('checkN8nStatus()'))
  assert.doesNotMatch(source, /baseUrl:\s*result\.baseUrl/)
})

test('n8n test authenticates and rate limits before outbound work', async () => {
  const source = await read('src/app/api/automations/n8n/test/route.ts')
  const auth = source.indexOf('resolveCaller(req)')
  const rateLimit = source.indexOf('checkRateLimit(')
  const statusProbe = source.indexOf('checkN8nStatus()')
  assert.ok(auth >= 0 && auth < rateLimit)
  assert.ok(rateLimit < statusProbe)
  assert.match(source, /workspace_id:\s*caller\.workspaceId/)
})

test('real WhatsApp sends are rate limited per user and workspace', async () => {
  const source = await read('src/app/api/inbox/conversations/[id]/messages/route.ts')
  assert.match(source, /requestedMode === 'send' && !checkRateLimit\(`inbox-send:\$\{user\.id\}:\$\{workspaceId\}`/)
  assert.match(source, /status:\s*429/)
})
