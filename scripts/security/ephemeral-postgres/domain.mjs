import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../../..', import.meta.url)))
const fixturePath = resolve(root, 'supabase/tests/telecom-domain-rls.sql')
const readerFixturePath = resolve(root, 'supabase/tests/telecom-server-read-rpc.sql')
const db = new PGlite({ extensions: { pgcrypto, btree_gist } })

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users(
      id uuid primary key,
      instance_id uuid,
      aud text,
      role text,
      email text,
      encrypted_password text,
      email_confirmed_at timestamptz,
      raw_app_meta_data jsonb,
      raw_user_meta_data jsonb,
      created_at timestamptz,
      updated_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    set app.environment = 'test';
  `)

  const migrations = (await readdir(resolve(root, 'supabase/migrations')))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (const migration of migrations) {
    await db.exec(await readFile(resolve(root, 'supabase/migrations', migration), 'utf8'))
    console.log(`APPLIED ${migration}`)
  }
  console.log(`FRESH ZERO-TO-HEAD PASS (${migrations.length} migrations)`)

  const fixture = (await readFile(fixturePath, 'utf8')).replace(/^\\.*$/gm, '')
  assert.match(fixture, /rollback;\s*$/i, 'domain fixture must end with rollback')
  await db.exec(fixture)
  console.log('TELECOM DOMAIN SQL ASSERTIONS PASS')

  const readerFixture = (await readFile(readerFixturePath, 'utf8')).replace(/^\\.*$/gm, '')
  assert.match(readerFixture, /rollback;\s*$/i, 'server reader fixture must end with rollback')
  await db.exec(readerFixture)
  console.log('TELECOM SERVER READ RPC ASSERTIONS PASS')

  const seed = await readFile(resolve(root, 'supabase/seeds/synthetic_portfolio.sql'), 'utf8')
  await db.exec(seed)
  const scoped = await db.query(`
    select
      jsonb_array_length(public.telecom_v1_customer_search_rows(
        'a1000000-0000-4000-8000-000000000001',
        'b2000000-0000-4000-8000-000000000001',
        'Synthetic', null, null, 20, null, null)->'rows') as a_count,
      public.telecom_v1_customer_get_row(
        'a1000000-0000-4000-8000-000000000001',
        'b2000000-0000-4000-8000-000000000001',
        'd4000000-0000-4000-8000-000000000002') is null as b_hidden
  `)
  assert.equal(scoped.rows[0].a_count, 1)
  assert.equal(scoped.rows[0].b_hidden, true)
  console.log('SYNTHETIC A/B SEED SCOPE PASS')

  // Embedded-engine recovery probe only: this binary datadir is neither a
  // PostgreSQL logical backup nor an encrypted offsite Supabase backup.
  const snapshot = await db.dumpDataDir('none')
  const bytes = Buffer.from(await snapshot.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256)
  const restored = new PGlite({ loadDataDir: snapshot, extensions: { pgcrypto, btree_gist } })
  try {
    const verification = await restored.query(`
      select
        (select count(*)::integer from public.customers) as customer_count,
        (select count(*)::integer from public.workspace_members) as member_count,
        to_regclass('public.telecom_contracts') is not null as schema_present,
        jsonb_array_length(public.telecom_v1_customer_search_rows(
          'a1000000-0000-4000-8000-000000000001',
          'b2000000-0000-4000-8000-000000000001',
          'Synthetic',null,null,20,null,null)->'rows') as authorized_count,
        public.telecom_v1_customer_get_row(
          'a1000000-0000-4000-8000-000000000001',
          'b2000000-0000-4000-8000-000000000001',
          'd4000000-0000-4000-8000-000000000002') is null as foreign_hidden
    `)
    assert.deepEqual(verification.rows[0], {
      customer_count: 2, member_count: 2, schema_present: true,
      authorized_count: 1, foreign_hidden: true,
    })
    console.log(JSON.stringify({
      kind: 'synthetic_pglite_restore_test_only',
      migration_count: migrations.length,
      snapshot_sha256: sha256,
      snapshot_bytes: bytes.byteLength,
      schema: 'pass', rows: 'pass', scoped_read: 'pass', foreign_denial: 'pass',
      production_backup: false,
    }))
  } finally {
    await restored.close()
  }
} catch (error) {
  console.error('DISPOSABLE DOMAIN DB FAILURE', error.code, error.message)
  process.exitCode = 1
} finally {
  await db.close()
}
