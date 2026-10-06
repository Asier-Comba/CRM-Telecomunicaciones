import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../../..', import.meta.url)))
const db = new PGlite({ extensions: { pgcrypto, btree_gist } })
try {
  await db.exec(await readFile(resolve(root, 'scripts/security/native-postgres/bootstrap.sql'), 'utf8'))
  await db.exec(await readFile(resolve(root, 'scripts/security/ephemeral-postgres/storage-stub.sql'), 'utf8'))
  await db.exec("set app.environment='test'")
  const migrations = (await readdir(resolve(root, 'supabase/migrations'))).filter(n => n.endsWith('.sql')).sort()
  for (const name of migrations) await db.exec(await readFile(resolve(root, 'supabase/migrations', name), 'utf8'))
  await db.exec(await readFile(resolve(root, 'supabase/tests/assistant-conversations-v2.sql'), 'utf8'))
  const manifest = JSON.parse(await readFile(resolve(root, 'scripts/security/native-postgres/function-privileges.json'), 'utf8'))
  const snapshot = (await db.query(await readFile(resolve(root, 'scripts/security/native-postgres/privilege-snapshot.sql'), 'utf8'))).rows[0].snapshot
  assert.deepEqual(snapshot.functions, manifest.functions)
  console.log(`ASSISTANT THREAD RLS/ATOMICITY FIXTURE PASS; ${migrations.length} migrations; EMBEDDED, NOT NATIVE PROCESS EVIDENCE`)
} finally { await db.close() }
