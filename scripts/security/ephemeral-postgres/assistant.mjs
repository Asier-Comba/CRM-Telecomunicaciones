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
  const snapshotSql = await readFile(resolve(root, 'scripts/security/native-postgres/privilege-snapshot.sql'), 'utf8')
  // Regression for native pg_restore's explicit-default -> NULL ACL
  // normalization. Compare the actual snapshot, not a hand-built JSON stand-in.
  await db.exec('begin; create sequence public.w3_sequence_acl_probe')
  assert.equal((await db.query("select relacl is null as implicit from pg_class where oid='public.w3_sequence_acl_probe'::regclass")).rows[0].implicit, true)
  const implicit = (await db.query(snapshotSql)).rows[0].snapshot.relations.find(r => r.name === 'public.w3_sequence_acl_probe')
  assert.deepEqual(implicit.grants.map(g => g.privilege), ['SELECT', 'UPDATE', 'USAGE'])
  await db.exec('grant usage on sequence public.w3_sequence_acl_probe to authenticated; revoke all on sequence public.w3_sequence_acl_probe from authenticated')
  assert.equal((await db.query("select relacl is not null as explicit from pg_class where oid='public.w3_sequence_acl_probe'::regclass")).rows[0].explicit, true)
  const explicit = (await db.query(snapshotSql)).rows[0].snapshot.relations.find(r => r.name === 'public.w3_sequence_acl_probe')
  assert.deepEqual(explicit, implicit)
  await db.exec('rollback')
  await db.exec("set app.environment='test'")
  const migrations = (await readdir(resolve(root, 'supabase/migrations'))).filter(n => n.endsWith('.sql')).sort()
  for (const name of migrations) await db.exec(await readFile(resolve(root, 'supabase/migrations', name), 'utf8'))
  await db.exec(await readFile(resolve(root, 'supabase/tests/assistant-conversations-v2.sql'), 'utf8'))
  const manifest = JSON.parse(await readFile(resolve(root, 'scripts/security/native-postgres/function-privileges.json'), 'utf8'))
  const snapshot = (await db.query(snapshotSql)).rows[0].snapshot
  assert.deepEqual(snapshot.functions, manifest.functions)
  console.log(`ASSISTANT THREAD RLS/ATOMICITY FIXTURE PASS; ${migrations.length} migrations; EMBEDDED, NOT NATIVE PROCESS EVIDENCE`)
} finally { await db.close() }
