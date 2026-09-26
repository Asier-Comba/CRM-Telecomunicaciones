import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const file = 'supabase/migrations/20260926163000_telecom_commercial_operations.sql'
const sql = await readFile(file, 'utf8')
const allSql = (await Promise.all(
  (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => readFile(`supabase/migrations/${name}`, 'utf8')),
)).join('\n')
const relations = ['opportunity_stages', 'opportunities', 'tasks', 'calendar_events', 'activities']
const mutableRelations = relations.filter((name) => name !== 'activities')
const tableBlock = (name) => sql.match(new RegExp(`create table public\\.${name} \\(([\\s\\S]*?)\\n\\);`))?.[1]
const policyBlock = (name, source = sql) => source.match(new RegExp(`create policy ${name} [^;]+;`))?.[0]
const functionBlock = (name) => sql.match(new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?\\n\\$\\$;`))?.[0]

test('commercial operation relations are tenant-scoped, forced-RLS and raw-closed', () => {
  for (const relation of relations) {
    assert.match(tableBlock(relation), /workspace_id uuid not null references public\.workspaces/)
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`))
    assert.match(sql, new RegExp(`alter table public\\.${relation} force row level security`))
    assert.match(sql, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
    assert.match(policyBlock(`${relation}_select_active_member`), /using \(public\.is_workspace_member\(workspace_id\)\)/)
  }
  for (const relation of mutableRelations) {
    assert.match(policyBlock(`${relation}_insert_owner_admin`), /has_workspace_role[\s\S]*created_by_user_id = auth\.uid\(\)/)
    assert.match(policyBlock(`${relation}_update_owner_admin`), /for update[\s\S]*has_workspace_role[\s\S]*with check[\s\S]*has_workspace_role/)
  }
  assert.match(policyBlock('activities_insert_owner_admin'), /has_workspace_role[\s\S]*created_by_user_id = auth\.uid\(\)/)
  assert.match(policyBlock('activities_insert_owner_admin'), /source = 'manual'[\s\S]*actor_kind = 'user'[\s\S]*actor_user_id = auth\.uid\(\)/)
  assert.doesNotMatch(
    allSql,
    /grant\s+(?:select|insert|update|delete|all)[^;]*on\s+(?:table\s+)?public\.(?:opportunity_stages|opportunities|tasks|calendar_events|activities)\s+to\s+(?:public|anon|authenticated)/i,
  )
  assert.doesNotMatch(allSql, /grant\s+[^;]*on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(allSql, /alter\s+default\s+privileges[^;]*grant\s+[^;]*on\s+tables\s+to\s+(?:public|anon|authenticated)/i)
  assert.doesNotMatch(sql, /for delete/i)
})

test('opportunities are customer-bound with closed lifecycle and money semantics', () => {
  const opportunity = tableBlock('opportunities')
  assert.match(opportunity, /foreign key \(customer_id, workspace_id\) references public\.customers/)
  assert.match(opportunity, /foreign key \(stage_id, workspace_id\) references public\.opportunity_stages/)
  assert.match(opportunity, /status in \('open', 'won', 'lost', 'cancelled'\)/)
  assert.match(opportunity, /\(amount_minor is null\) = \(currency is null\)/)
  assert.match(opportunity, /\(status = 'open'\) = \(closed_at is null\)/)
  assert.match(sql, /opportunity stage does not match lifecycle/)
  assert.match(sql, /requires_active and stage_status <> 'active'/)
  assert.match(sql, /referenced stage outcome is immutable/)
  assert.match(sql, /opportunity_stages_protect_outcome before update of outcome/)
  assert.match(sql, /opportunity owner is not an active workspace member/)
})

test('tasks and meetings support workspace work while binding opportunity work to its customer', () => {
  for (const relation of ['tasks', 'calendar_events']) {
    const block = tableBlock(relation)
    assert.match(block, /customer_id uuid,/)
    assert.match(block, /foreign key \(opportunity_id, workspace_id, customer_id\)/)
    assert.match(block, /references public\.opportunities\(id, workspace_id, customer_id\)/)
    assert.match(block, /check \(opportunity_id is null or customer_id is not null\)/)
  }
  assert.match(tableBlock('tasks'), /status in \('pending', 'in_progress', 'completed', 'cancelled'\)/)
  assert.match(tableBlock('tasks'), /version bigint not null default 1/)
  assert.doesNotMatch(tableBlock('tasks'), /no_show_at/)
  assert.match(sql, /task version is server-managed/)
  assert.match(sql, /task version must start at one/)
  assert.match(sql, /tasks_manage_version before insert or update/)
  assert.match(tableBlock('calendar_events'), /status in \('scheduled', 'completed', 'cancelled', 'no_show'\)/)
  assert.match(tableBlock('calendar_events'), /ends_at is null or ends_at > starts_at/)
  assert.match(tableBlock('calendar_events'), /no_show_at timestamptz/)
  assert.match(tableBlock('calendar_events'), /\(status = 'no_show'\) = \(no_show_at is not null\)/)
  assert.match(sql, /assignee is not an active workspace member/)
  assert.match(functionBlock('validate_meeting_timezone'), /meeting timezone must be an IANA timezone/)
  assert.doesNotMatch(functionBlock('validate_work_item_assignment'), /occurred_at|actor_user_id|timezone/)
  assert.match(sql, /calendar_events_validate_timezone before insert or update of timezone/)
})

test('activity is append-only, redacted and validates target/customer scope', () => {
  const activity = tableBlock('activities')
  assert.match(activity, /summary_code text not null/)
  assert.match(activity, /'entity\.created'[\s\S]*'system\.synchronized'/)
  assert.doesNotMatch(activity, /safe_summary text/)
  assert.doesNotMatch(activity, /metadata jsonb|before_value|after_value|prompt/i)
  assert.match(sql, /Raw PII, prompts, documents and before\/after dumps are forbidden/)
  assert.match(sql, /activities_append_only before update or delete/)
  assert.match(sql, /activities are append-only/)
  for (const target of ['contract', 'service', 'opportunity', 'task', 'event']) {
    assert.match(sql, new RegExp(`activity ${target} scope mismatch`))
  }
  assert.match(sql, /activity actor is not the active caller/)
  assert.match(sql, /non-user activity cannot impersonate a user/)
  assert.match(sql, /activity service contract mismatch/)
  assert.match(sql, /activity task opportunity mismatch/)
  assert.match(sql, /activity event opportunity mismatch/)
  assert.match(sql, /activity occurrence cannot be in the future/)
  assert.match(sql, /activities_source_event_uidx/)
  assert.match(activity, /source_event_ref text/)
  assert.doesNotMatch(activity, /actor_user_id uuid references auth\.users/)
  assert.match(functionBlock('validate_activity_scope'), /activity occurrence cannot be in the future/)
  assert.match(functionBlock('validate_activity_scope'), /activity actor is not the active caller/)
  assert.doesNotMatch(sql, /activities_update_owner_admin/)
  for (const relation of ['opportunity_stages', 'opportunities', 'tasks', 'calendar_events']) {
    assert.match(sql, new RegExp(`create trigger ${relation}_protect_identity before update`))
  }
  for (const fn of ['validate_opportunity_context', 'protect_referenced_opportunity_stage', 'validate_work_item_assignment', 'validate_meeting_timezone', 'validate_activity_scope']) {
    assert.match(functionBlock(fn), /security definer set search_path = ''/)
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\(\\) from public, anon, authenticated`))
  }
})

test('operation indexes cover dashboard, customer and ownership reads', () => {
  for (const index of [
    'opportunities_customer_status_idx', 'opportunities_owner_status_idx', 'opportunities_stage_idx', 'opportunities_dashboard_idx',
    'tasks_due_idx', 'tasks_customer_idx', 'tasks_assignee_idx', 'tasks_opportunity_idx',
    'calendar_events_window_idx', 'calendar_events_customer_idx', 'calendar_events_assignee_idx',
    'calendar_events_opportunity_idx', 'activities_workspace_time_idx', 'activities_customer_time_idx',
  ]) assert.match(sql, new RegExp(`create index ${index}`))
})

test('operation security invariants have mutation-style negative controls', () => {
  const assertContract = (source) => {
    for (const relation of relations) {
      assert.match(source, new RegExp(`alter table public\\.${relation} force row level security`))
      assert.match(source, new RegExp(`revoke all on table public\\.${relation} from public, anon, authenticated`))
      assert.match(policyBlock(`${relation}_select_active_member`, source), /is_workspace_member\(workspace_id\)/)
    }
    assert.match(source, /foreign key \(opportunity_id, workspace_id, customer_id\)/)
    assert.match(source, /activities_append_only before update or delete/)
    assert.match(source, /security definer set search_path = ''/)
    assert.match(source, /activity contract scope mismatch/)
    assert.match(source, /entity, workspace and creator are immutable/)
    assert.match(source, /opportunity customer is immutable/)
    assert.match(source, /opportunities_protect_identity before update/)
    assert.match(source, /activity actor is not the active caller/)
    assert.match(source, /referenced stage outcome is immutable/)
  }
  assert.doesNotThrow(() => assertContract(sql))
  for (const weakened of [
    sql.replace('alter table public.tasks force row level security;', ''),
    sql.replaceAll('foreign key (opportunity_id, workspace_id, customer_id)', 'foreign key (opportunity_id)'),
    sql.replace('activities_append_only before update or delete', 'activities_append_only before delete'),
    sql.replaceAll("security definer set search_path = ''", "security definer set search_path = 'public'"),
    sql.replace('using (public.is_workspace_member(workspace_id));', 'using (true);'),
    sql.replace("message = 'activity contract scope mismatch'", "message = 'activity target invalid'"),
    sql.replaceAll("message = 'entity, workspace and creator are immutable'", "message = 'identity may change'"),
    sql.replace("message = 'opportunity customer is immutable'", "message = 'opportunity customer may change'"),
    sql.replace('opportunities_protect_identity before update', 'opportunities_identity_unprotected after update'),
    sql.replace("message = 'activity actor is not the active caller'", "message = 'activity actor accepted'"),
    sql.replace("message = 'referenced stage outcome is immutable'", "message = 'stage outcome changed'"),
  ]) assert.throws(() => assertContract(weakened))
})
