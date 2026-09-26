import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

// Runner negative controls only. This miniature schema is NOT the CRM schema.
const db = new PGlite()
try {
  await db.exec(`
    create role authenticated; create role anon; create role service_principal;
    create table memberships(actor text, workspace text, role text, active boolean);
    create table workspaces(id text primary key, active boolean);
    create table records(id text primary key, workspace text, payload text);
    insert into workspaces values ('A',true),('B',true),('S',false);
    insert into memberships values
      ('managerA','A','manager',true),('memberA','A','member',true),
      ('memberB','B','member',true),('removed','A','member',false),
      ('suspended','S','manager',true),('multi','A','member',true),
      ('multi','B','member',true),('integrationA','A','manager',true);
    insert into records values ('a','A','synthetic'),('b','B','synthetic'),('s','S','synthetic');
    alter table records enable row level security;
    alter table records force row level security;
    grant select on memberships,workspaces to authenticated,service_principal;
    grant select,update on records to authenticated,service_principal;
    grant select on records to anon;
    create policy scoped_read on records for select to authenticated,service_principal using (
      workspace = current_setting('test.workspace',true) and exists (
        select 1 from memberships m join workspaces w on w.id=m.workspace
        where m.actor=current_setting('test.actor',true) and m.workspace=records.workspace and m.active and w.active));
    create policy scoped_update on records for update to authenticated,service_principal using (
      workspace = current_setting('test.workspace',true) and exists (
        select 1 from memberships m join workspaces w on w.id=m.workspace
        where m.actor=current_setting('test.actor',true) and m.workspace=records.workspace and m.active and w.active and m.role='manager'))
      with check (workspace=current_setting('test.workspace',true));
  `)
  for (const [role,actor,workspace,expected] of [
    ['anon','','A',[]], ['authenticated','memberA','A',['a']],
    ['authenticated','memberA','B',[]], ['authenticated','memberB','B',['b']],
    ['authenticated','memberB','A',[]], ['authenticated','removed','A',[]],
    ['authenticated','suspended','S',[]], ['authenticated','multi','A',['a']],
    ['authenticated','multi','B',['b']], ['service_principal','integrationA','A',['a']],
    ['service_principal','integrationA','B',[]],
  ]) {
    // Role comes only from this static local allowlist, never user input.
    await db.exec(`reset role; set role ${role}`)
    await db.query("select set_config('test.actor',$1,false),set_config('test.workspace',$2,false)",[actor,workspace])
    assert.deepEqual((await db.query('select id from records order by id')).rows.map(x=>x.id),expected)
  }
  await db.exec('reset role; set role authenticated')
  await db.query("select set_config('test.actor','memberA',false),set_config('test.workspace','A',false)")
  assert.equal((await db.query("update records set payload='changed' returning id")).rows.length,0)
  await db.query("select set_config('test.actor','managerA',false)")
  assert.deepEqual((await db.query("update records set payload='changed' returning id")).rows.map(x=>x.id),['a'])
  await assert.rejects(db.query("update records set workspace='B' where id='a'"), { code:'42501' })
  console.log('Disposable PostgreSQL self-test: 11 scope cases and 3 write controls PASS (synthetic harness only)')
} finally { await db.close() }
