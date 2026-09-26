import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPaths = (await readdir('supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()
const sql = (await Promise.all(
  migrationPaths.map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')

function latestFunction(name) {
  const matches = [...sql.matchAll(
    new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`, 'g'),
  )]
  return matches.at(-1)?.[0]
}

test('workspace membership is the only tenant role source', () => {
  const profilesBlock = sql.match(
    /create table public\.profiles \(([\s\S]*?)\n\);/,
  )?.[1]
  const membersBlock = sql.match(
    /create table public\.workspace_members \(([\s\S]*?)\n\);/,
  )?.[1]

  assert.ok(profilesBlock)
  assert.ok(membersBlock)
  assert.doesNotMatch(profilesBlock, /^\s*role\s+/m)
  assert.match(
    membersBlock,
    /role in \('owner', 'admin', 'member', 'viewer'\)/,
  )
  assert.match(membersBlock, /status in \('active', 'suspended'\)/)
})

test('tenant helpers fail closed on inactive or absent membership', () => {
  for (const helper of [
    'current_workspace_ids',
    'current_workspace_role',
    'is_workspace_member',
    'has_workspace_role',
    'shares_workspace_with',
  ]) {
    const block = latestFunction(helper)
    assert.ok(block, `${helper} must be defined`)
    assert.match(block, /security definer/)
    assert.match(block, /set search_path = ''/)
    assert.match(block, /wm\.status = 'active'|mine\.status = 'active'/)
    assert.match(block, /join public\.workspaces as w/)
    assert.match(block, /w\.status = 'active'/)
  }
})

test('membership visibility and manager privileges require an active workspace', () => {
  const latestPolicy = sql.lastIndexOf('create policy workspace_members_select_self_or_admin')
  assert.ok(latestPolicy >= 0)
  const policy = sql.slice(latestPolicy, sql.indexOf(';', latestPolicy) + 1)
  assert.match(policy, /user_id = auth\.uid\(\) and public\.is_workspace_member\(workspace_id\)/)
  assert.match(policy, /public\.has_workspace_role/)
})

test('authenticated users cannot mutate workspaces or memberships directly', () => {
  assert.match(sql, /revoke all on table public\.workspaces from anon, authenticated/)
  assert.match(sql, /revoke all on table public\.workspace_members from anon, authenticated/)
  assert.match(sql, /grant select on table public\.workspaces to authenticated/)
  assert.match(sql, /grant select on table public\.workspace_members to authenticated/)
  assert.doesNotMatch(
    sql,
    /grant\s+(?:insert|update|delete|all)[^;]*public\.(?:workspaces|workspace_members)\s+to authenticated/i,
  )
})

test('all core tables enable RLS and expose only explicit policies', () => {
  for (const relation of ['workspaces', 'profiles', 'workspace_members']) {
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
  }
  assert.match(sql, /create policy workspaces_select_member/)
  assert.match(sql, /create policy profiles_select_shared_workspace/)
  assert.match(sql, /create policy workspace_members_select_self_or_admin/)
})
