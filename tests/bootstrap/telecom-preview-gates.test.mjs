import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const active = [
  'src/lib/brand.ts', 'src/components/Sidebar.tsx', 'src/app/login/page.tsx',
  'src/app/(saas)/dashboard/page.tsx', 'src/app/(saas)/clients/page.tsx',
  'src/app/(saas)/clients/[id]/page.tsx', 'src/app/(saas)/opportunities/page.tsx',
  'src/app/(saas)/calendar/page.tsx', 'src/app/(saas)/assistant/page.tsx',
]
const banned = /inmueble|inmobiliaria|gestor[ií]a|extranjer[ií]a|propietario|comprador|inquilino|vivienda|alquiler|honorarios|demo-real-estate|real-estate/i
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('active telecom preview has no legacy vertical vocabulary', async () => {
  for (const path of active) {
    const source = stripComments(await readFile(path, 'utf8'))
    assert.equal(banned.test(source), false, `legacy vocabulary in ${path}`)
  }
})

test('preview pages do not import mutation or external-effect modules', async () => {
  for (const path of active.slice(3)) {
    const source = stripComments(await readFile(path, 'utf8'))
    assert.doesNotMatch(source, /create(?:Task|Client|Opportunity|Calendar)|update(?:Task|Client|Opportunity)|delete(?:Task|Client|Opportunity)|triggerN8n|callAgentTool|supabase-admin/)
  }
})

test('synthetic fixture uses reserved identities and no contact or tax values', async () => {
  const source = await readFile('src/lib/telecom-preview/data.ts', 'utf8')
  assert.doesNotMatch(source, /arizan|[\w.-]+@[\w.-]+\.\w+|\+34|\b[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]\b/i)
  assert.match(source, /visibility: 'hidden'/)
  assert.match(source, /cust_demo_/)
})

test('preview access and assistant route fail closed for production', async () => {
  const gate = await readFile('src/components/AuthGate.tsx', 'utf8')
  const identity = await readFile('src/lib/current-user.ts', 'utf8')
  const route = await readFile('src/app/api/assistant/read-preview/route.ts', 'utf8')
  assert.match(gate, /DEMO_FALLBACK_ALLOWED && window\.localStorage/)
  assert.match(identity, /featureFlags\.demoData && typeof window/)
  assert.match(route, /process\.env\.NODE_ENV !== 'production'/)
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|fetch\(['"]https?:/)
})
