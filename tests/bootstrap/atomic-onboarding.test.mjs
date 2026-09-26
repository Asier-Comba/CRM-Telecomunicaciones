import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPaths = (await readdir('supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()
const migrationSql = (await Promise.all(
  migrationPaths.map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')
const definitions = [...migrationSql.matchAll(
  /create or replace function public\.provision_workspace\([\s\S]*?\n\$\$;/g,
)]
const sql = definitions.at(-1)?.[0] ?? ''
const route = await readFile('src/app/api/onboarding/workspace/route.ts', 'utf8')

test('onboarding is one authenticated transaction with an owner membership', () => {
  assert.match(sql, /security definer/)
  assert.match(sql, /set search_path = ''/)
  assert.match(sql, /auth\.uid\(\)/)
  assert.match(sql, /pg_advisory_xact_lock/)
  assert.match(sql, /insert into public\.workspaces/)
  assert.match(sql, /insert into public\.workspace_members[\s\S]*'owner', 'active'/)
  assert.match(sql, /insert into public\.profiles/)
  assert.match(migrationSql, /grant execute on function public\.provision_workspace\(text, text\) to authenticated/)
})

test('retry returns an existing active membership before inserting', () => {
  const lookup = sql.indexOf('from public.workspace_members as wm')
  const insert = sql.indexOf('insert into public.workspaces')
  assert.ok(lookup >= 0 && lookup < insert)
  assert.match(sql, /select v_workspace\.id[\s\S]*false/)
  assert.match(sql, /join public\.workspaces as w/)
  assert.match(sql, /w\.status = 'active'/)
  assert.match(sql, /workspace suspended/)
})

test('the route authenticates and delegates to the canonical RPC', () => {
  const auth = route.indexOf('supabase.auth.getUser()')
  const rpc = route.indexOf("supabase.rpc('provision_workspace'")
  assert.ok(auth >= 0 && auth < rpc)
  assert.match(route, /slug_taken/)
  assert.match(route, /workspace_suspended/)
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|getSupabaseAdminClient/)
})
