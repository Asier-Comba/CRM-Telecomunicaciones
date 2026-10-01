import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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
  await db.exec('reset role')
  const snapshot = await db.dumpDataDir()
  const bytes = await snapshot.arrayBuffer()
  const checksum = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
  const copy = new Blob([bytes])
  assert.equal(createHash('sha256').update(new Uint8Array(await copy.arrayBuffer())).digest('hex'), checksum)
  const recovered = new PGlite({ loadDataDir: copy })
  try {
    assert.equal((await recovered.query('select count(*)::int as n from records')).rows[0].n, 3)
    await recovered.exec('set role authenticated')
    await recovered.query("select set_config('test.actor','memberA',false),set_config('test.workspace','B',false)")
    assert.equal((await recovered.query('select * from records')).rows.length,0)
    await recovered.query("select set_config('test.workspace','A',false)")
    assert.deepEqual((await recovered.query('select id,payload from records')).rows,[{id:'a',payload:'changed'}])
    console.log('Synthetic embedded database snapshot/restore: checksum, data and RLS PASS; not commercial DR evidence')
  } finally { await recovered.close() }
} finally { await db.close() }
