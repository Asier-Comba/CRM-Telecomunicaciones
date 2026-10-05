import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const pathUrl = (path) => new URL(path, root)

test('legacy privileged endpoints are absent from the canonical bootstrap', async () => {
  const removed = [
    'src/app/api/agent/tool/route.ts',
    'src/app/api/agent/action/route.ts',
    'src/app/api/agent/automation/route.ts',
    'src/app/api/assistant/confirm/route.ts',
    'src/app/api/automations/n8n/status/route.ts',
    'src/app/api/automations/n8n/test/route.ts',
    'src/app/api/inbox/conversations/[id]/messages/route.ts',
    'src/app/api/integrations/meta/whatsapp/webhook/route.ts',
  ]

  for (const path of removed) {
    await assert.rejects(access(pathUrl(path)), { code: 'ENOENT' }, `${path} must remain disabled`)
  }
})

test('the sensitive-route registry stays on the W4 v2 contract', async () => {
  const registry = JSON.parse(await readFile(pathUrl('.security/sensitive-routes.json'), 'utf8'))
  assert.equal(registry.version, 2)
  assert.deepEqual(registry.routes, [])
})
