import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

// Disposable native metadata only. Never print assertion payloads, rows,
// credentials or unrecognized values. This cannot accept/reject a restore:
// the unchanged strict checker MUST still run immediately after it.
const categories = ['functions', 'relations', 'schemas', 'defaults', 'policies', 'roles']
const roles = new Set(['PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres'])
const privileges = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'USAGE', 'EXECUTE', 'MAINTAIN'])
const identifier = v => typeof v === 'string' && /^(?:public|auth|storage)\.[a-z][a-z0-9_]{0,99}$/.test(v) ? v : 'metadata_entry'
const grants = v => Array.isArray(v) ? v.slice(0, 40).map(g => ({ role: roles.has(g?.role) ? g.role : 'OTHER', privilege: privileges.has(g?.privilege) ? g.privilege : 'OTHER', grantable: g?.grantable === true })) : null
try {
  const [fresh, restored] = process.argv.slice(2).map(path => JSON.parse(readFileSync(path, 'utf8')))
  for (const category of categories) {
    if (isDeepStrictEqual(fresh?.[category], restored?.[category])) continue
    console.error(`SAFE_METADATA_DRIFT category=${category}`)
    if (category !== 'relations' || !Array.isArray(fresh?.relations) || !Array.isArray(restored?.relations)) continue
    let shown = 0
    for (const entry of fresh.relations) {
      const other = restored.relations.find(r => r?.name === entry?.name)
      if (isDeepStrictEqual(entry, other)) continue
      console.error(`SAFE_METADATA_RELATION name=${identifier(entry?.name)} fresh_grants=${JSON.stringify(grants(entry?.grants))} restored_grants=${JSON.stringify(grants(other?.grants))}`)
      if (++shown >= 20) break
    }
  }
} catch { console.error('SAFE_METADATA_DIAGNOSTIC_UNAVAILABLE') }
