import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const [manifestPath, freshPath, restoredPath] = process.argv.slice(2)
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const fresh = JSON.parse(readFileSync(freshPath, 'utf8'))
  assert.equal(manifest.version, 1)
  assert.ok(manifest.functions.length >= 14)
  assert.deepEqual(fresh.functions, manifest.functions)
  assert.ok(fresh.functions.every(fn => !fn.definer || !fn.public))
  assert.deepEqual(fresh.roles, [
    { name: 'anon', superuser: false, bypassRls: false, login: false },
    { name: 'authenticated', superuser: false, bypassRls: false, login: false },
    { name: 'service_role', superuser: false, bypassRls: true, login: false },
  ])
  if (restoredPath) assert.deepEqual(JSON.parse(readFileSync(restoredPath, 'utf8')), fresh)
  console.log(`Privilege matrix PASS (${manifest.functions.length} functions; PUBLIC/anon/authenticated/service_role; raw grants/RLS/schemas/defaults/roles).`)
} catch {
  // No assertion payloads, tenant contents or credentials in CI logs.
  console.error('Privilege matrix REJECTED: role/grant drift; restored environment must remain unexposed.')
  process.exitCode = 1
}
