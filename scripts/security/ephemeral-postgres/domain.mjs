import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../../..', import.meta.url)))
const fixturePath = resolve(root, 'supabase/tests/telecom-domain-rls.sql')
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
} catch (error) {
  console.error('DISPOSABLE DOMAIN DB FAILURE', error.code, error.message)
  process.exitCode = 1
} finally {
  await db.close()
}
