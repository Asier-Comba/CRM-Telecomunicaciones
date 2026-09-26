import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const sql = await readFile('supabase/migrations/20260926161000_telecom_operator_plan_catalog.sql', 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')

test('operator, plan and immutable plan-version relations are normalized', () => {
  for (const relation of ['telecom_operators', 'telecom_plans', 'telecom_plan_versions']) {
    assert.match(sql, new RegExp(`create table public\\.${relation}`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
  }
  assert.match(sql, /service_kind in \('mobile', 'fiber', 'fixed_voice', 'data_connectivity', 'other'\)/)
  assert.match(sql, /foreign key \(operator_id, workspace_id\)/)
  assert.match(sql, /foreign key \(plan_id, workspace_id\)/)
  assert.match(sql, /unique \(workspace_id, plan_id, version_number\)/)
  assert.match(sql, /valid_until is null or valid_until >= valid_from/)
  assert.match(sql, /exclude using gist/)
  assert.match(sql, /daterange\(valid_from, coalesce\(valid_until, 'infinity'::date\), '\[\]'\) with &&/)
  assert.doesNotMatch(sql, /vodafone|orange|movistar/i)
  assert.doesNotMatch(sql, /metadata jsonb/i)
})

test('catalog policies use active-workspace helpers and expose no raw grants or deletes', () => {
  assert.match(sql, /public\.is_workspace_member\(workspace_id\)/)
  assert.match(sql, /public\.has_workspace_role\(workspace_id, array\['owner', 'admin'\]::text\[\]\)/)
  assert.doesNotMatch(sql, /for delete/i)
  assert.doesNotMatch(
    allSql,
    /grant\s+(?:select|insert|update|delete|all)[^;]*on\s+(?:table\s+)?public\.(?:telecom_operators|telecom_plans|telecom_plan_versions)\s+to\s+(?:public|anon|authenticated)/i,
  )
  assert.doesNotMatch(allSql, /grant\s+[^;]*on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(allSql, /alter\s+default\s+privileges[^;]*grant\s+[^;]*on\s+tables\s+to\s+(?:public|anon|authenticated)/i)
})

test('plan versions cannot be updated through a raw policy', () => {
  assert.match(sql, /create policy telecom_plan_versions_insert_owner_admin/)
  assert.doesNotMatch(sql, /create policy telecom_plan_versions_update_/)
  assert.match(sql, /create trigger telecom_plan_versions_immutable/)
  assert.match(sql, /before update or delete on public\.telecom_plan_versions/)
  assert.match(sql, /telecom plan versions are immutable/)
  assert.match(sql, /revoke all on function public\.reject_telecom_plan_version_mutation\(\) from public, anon, authenticated/)
  assert.match(sql, /Immutable commercial plan revisions/)
})
