import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const manifest = fileURLToPath(new URL('./function-privileges.json', import.meta.url))
const checker = fileURLToPath(new URL('./check-privilege-matrix.mjs', import.meta.url))
const baseline = {
  functions: JSON.parse(readFileSync(manifest, 'utf8')).functions,
  roles: [
    { name: 'anon', superuser: false, bypassRls: false, login: false },
    { name: 'authenticated', superuser: false, bypassRls: false, login: false },
    { name: 'service_role', superuser: false, bypassRls: true, login: false },
  ],
  relations: [{ name: 'public.customers', rls: true, forceRls: true, grants: [], columnGrants: [] }],
  schemas: [{ name: 'storage', anon: false }], policies: [], defaults: [],
}

function run(fresh, restored) {
  const dir = mkdtempSync(join(tmpdir(), 'w4-grants-'))
  try {
    writeFileSync(join(dir, 'fresh.json'), JSON.stringify(fresh))
    writeFileSync(join(dir, 'restored.json'), JSON.stringify(restored))
    return spawnSync(process.execPath, [checker, manifest, join(dir, 'fresh.json'), join(dir, 'restored.json')], { encoding: 'utf8' })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
test('metadata validator accepts exact controlled role/grant equality', () => {
  assert.equal(run(baseline, baseline).status, 0)
})
for (const [name, mutate] of [
  ['PUBLIC EXECUTE restore regression', x => { x.functions.find(f => f.definer).public = true }],
  ['raw grant drift', x => { x.relations[0].grants.push({ role: 'anon', privilege: 'SELECT', grantable: false }) }],
  ['column UPDATE drift survives table REVOKE', x => { x.relations[0].columnGrants.push({ column: 'status', role: 'authenticated', privilege: 'UPDATE', grantable: false }) }],
  ['RLS removal', x => { x.relations[0].rls = false }],
  ['Storage schema usage drift', x => { x.schemas[0].anon = true }],
  ['default privilege drift', x => { x.defaults.push({ role: 'anon', acl: 'EXECUTE' }) }],
  ['policy drift', x => { x.policies.push({ name: 'unsafe', using: 'true' }) }],
  ['anonymous BYPASSRLS', x => { x.roles[0].bypassRls = true }],
]) test(`metadata validator rejects ${name}`, () => {
  const restored = structuredClone(baseline); mutate(restored)
  const result = run(baseline, restored)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /REJECTED/)
  assert.doesNotMatch(result.stderr, /AssertionError|signature|workspace/)
})
test('unsafe fresh role model is rejected even if restore exactly matches', () => {
  const unsafe = structuredClone(baseline); unsafe.roles[0].superuser = true
  assert.equal(run(unsafe, unsafe).status, 1)
})
test('restore diagnosis prints allowlisted metadata, never unrecognized row/credential values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'w3-drift-'))
  try {
    const fresh = { relations: [{ name: 'private customer payload', grants: [{ role: 'private token', privilege: 'private value', grantable: false }], row: 'private row body' }] }
    const restored = { relations: [] }
    writeFileSync(join(dir, 'fresh.json'), JSON.stringify(fresh)); writeFileSync(join(dir, 'restored.json'), JSON.stringify(restored))
    const diagnostic = fileURLToPath(new URL('./diagnose-privilege-drift.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [diagnostic, join(dir, 'fresh.json'), join(dir, 'restored.json')], { encoding: 'utf8' })
    assert.equal(result.status, 0); assert.match(result.stderr, /SAFE_METADATA_DRIFT category=relations/)
    assert.match(result.stderr, /name=metadata_entry/); assert.doesNotMatch(result.stderr, /private|token|payload|row body/)
    assert.equal(run(baseline, { ...baseline, relations: [] }).status, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
