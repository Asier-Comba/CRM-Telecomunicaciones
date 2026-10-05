import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../../..', import.meta.url)))
const db = new PGlite({ extensions: { pgcrypto, btree_gist } })
const users = {
  owner: '10000000-0000-0000-0000-000000000001',
  removed: '10000000-0000-0000-0000-000000000002',
  rollback: '10000000-0000-0000-0000-000000000003',
  multi: '10000000-0000-0000-0000-000000000004',
}

async function authenticate(userId) {
  await db.exec('reset role; set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId])
}

async function asOwner() {
  await db.exec('reset role')
}

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
  await db.exec(await readFile(resolve(root, 'scripts/security/ephemeral-postgres/storage-stub.sql'), 'utf8'))

  const migrations = (await readdir(resolve(root, 'supabase/migrations')))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (const migration of migrations) {
    await db.exec(await readFile(resolve(root, 'supabase/migrations', migration), 'utf8'))
    console.log(`APPLIED ${migration}`)
  }
  console.log(`FRESH ZERO-TO-HEAD PASS (${migrations.length} migrations)`)

  for (const [label, id] of Object.entries(users)) {
    await db.query('insert into auth.users(id, email) values($1, $2)', [id, `${label}@example.invalid`])
  }

  // A. First authenticated onboarding creates one coherent tenant identity.
  await authenticate(users.owner)
  const first = (await db.query(
    "select * from public.provision_workspace('Synthetic Owner', 'synthetic-owner')",
  )).rows[0]
  assert.equal(first.created, true)
  await asOwner()
  assert.equal((await db.query("select count(*)::int as n from public.workspaces where slug='synthetic-owner'")).rows[0].n, 1)
  assert.equal((await db.query('select count(*)::int as n from public.workspace_members where workspace_id=$1 and user_id=$2 and role=$3 and status=$4', [first.id, users.owner, 'owner', 'active'])).rows[0].n, 1)
  assert.equal((await db.query('select workspace_id from public.profiles where id=$1', [users.owner])).rows[0].workspace_id, first.id)
  console.log('A FIRST AUTHENTICATED ONBOARDING PASS')

  // B. Replay returns the same workspace without duplicate identity rows.
  await authenticate(users.owner)
  const replay = (await db.query(
    "select * from public.provision_workspace('Ignored Replay', 'ignored-replay')",
  )).rows[0]
  assert.equal(replay.created, false)
  assert.equal(replay.id, first.id)
  await asOwner()
  assert.equal((await db.query('select count(*)::int as n from public.workspace_members where user_id=$1', [users.owner])).rows[0].n, 1)
  assert.equal((await db.query('select count(*)::int as n from public.workspaces')).rows[0].n, 1)
  console.log('B IDEMPOTENT RETRY PASS')

  // C. An active membership in a suspended workspace cannot be bypassed.
  await db.query("update public.workspaces set status='suspended' where id=$1", [first.id])
  await authenticate(users.owner)
  assert.equal((await db.query('select * from public.current_workspace_ids()')).rows.length, 0)
  await assert.rejects(
    db.query("select * from public.provision_workspace('Bypass', 'bypass')"),
    { code: '42501' },
  )
  console.log('C SUSPENDED WORKSPACE DENIAL PASS')

  // D. A stale profile cannot grant authority after membership removal.
  await asOwner()
  await db.query('update public.profiles set workspace_id=$2 where id=$1', [users.removed, first.id])
  await db.query("insert into public.workspace_members(workspace_id,user_id,role,status) values($1,$2,'member','active')", [first.id, users.removed])
  await db.query('delete from public.workspace_members where workspace_id=$1 and user_id=$2', [first.id, users.removed])
  await authenticate(users.removed)
  assert.equal((await db.query('select public.is_workspace_member($1) as allowed', [first.id])).rows[0].allowed, false)
  assert.equal((await db.query('select * from public.current_workspace_ids()')).rows.length, 0)
  assert.equal((await db.query('select * from public.workspaces')).rows.length, 0)
  const replacement = (await db.query(
    "select * from public.provision_workspace('Replacement', 'replacement')",
  )).rows[0]
  assert.notEqual(replacement.id, first.id)
  await asOwner()
  assert.equal((await db.query('select workspace_id from public.profiles where id=$1', [users.removed])).rows[0].workspace_id, replacement.id)
  console.log('D REMOVED MEMBERSHIP AND STALE PROFILE DENIAL PASS')

  // E. A failure after workspace/member inserts rolls the whole transaction back.
  await db.exec(`
    create function public.synthetic_profile_failure() returns trigger language plpgsql as $$
    begin
      if new.id = '${users.rollback}'::uuid then
        raise exception using errcode = 'P0001', message = 'synthetic profile failure';
      end if;
      return new;
    end;
    $$;
    create trigger synthetic_profile_failure before insert or update on public.profiles
      for each row execute function public.synthetic_profile_failure();
  `)
  await authenticate(users.rollback)
  await assert.rejects(
    db.query("select * from public.provision_workspace('Rollback', 'rollback')"),
    { code: 'P0001' },
  )
  await asOwner()
  assert.equal((await db.query("select count(*)::int as n from public.workspaces where slug='rollback'")).rows[0].n, 0)
  assert.equal((await db.query('select count(*)::int as n from public.workspace_members where user_id=$1', [users.rollback])).rows[0].n, 0)
  assert.equal((await db.query('select workspace_id from public.profiles where id=$1', [users.rollback])).rows[0].workspace_id, null)
  await db.exec('drop trigger synthetic_profile_failure on public.profiles; drop function public.synthetic_profile_failure()')
  console.log('E FORCED FAILURE FULL ROLLBACK PASS')

  // F. Two active memberships remain two explicit server-authorized scopes.
  await authenticate(users.multi)
  const multiFirst = (await db.query(
    "select * from public.provision_workspace('Multi A', 'multi-a')",
  )).rows[0]
  await asOwner()
  const multiSecond = (await db.query(
    "insert into public.workspaces(name,slug,status) values('Multi B','multi-b','active') returning id",
  )).rows[0]
  await db.query("insert into public.workspace_members(workspace_id,user_id,role,status) values($1,$2,'viewer','active')", [multiSecond.id, users.multi])
  await authenticate(users.multi)
  const scopes = (await db.query('select public.current_workspace_ids() as id')).rows.map((row) => row.id).sort()
  assert.deepEqual(scopes, [multiFirst.id, multiSecond.id].sort())
  assert.equal((await db.query('select public.current_workspace_role($1) as role', [multiFirst.id])).rows[0].role, 'owner')
  assert.equal((await db.query('select public.current_workspace_role($1) as role', [multiSecond.id])).rows[0].role, 'viewer')
  console.log('F MULTI-WORKSPACE AUTHORITY RESOLUTION PASS')
} catch (error) {
  console.error('DISPOSABLE DB FAILURE', error.code, error.message)
  process.exitCode = 1
} finally {
  await db.close()
}
