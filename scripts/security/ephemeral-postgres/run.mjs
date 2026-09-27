import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const root = process.argv[2]
const db = new PGlite({ extensions: { pgcrypto, btree_gist } })
try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema extensions;
 create table auth.users(id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 set app.environment='test';`)
 for (const f of (await readdir(root+'/supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
   await db.exec(await readFile(root+'/supabase/migrations/'+f,'utf8'))
   console.log('APPLIED '+f)
 }
 console.log('MIGRATIONS PASS')
 if(process.argv[3]) {
  let sql=(await readFile(process.argv[3],'utf8')).replace(/^\\.*$/gm,'')
  if(process.argv[4]) {
   const probe = await readFile(process.argv[4],'utf8')
   assert.match(sql, /rollback;\s*$/i, 'fixture must end with rollback')
   sql=sql.replace(/rollback;\s*$/i, () => probe+'\nrollback;')
  }
  await db.exec(sql)
  console.log('DOMAIN SQL ASSERTIONS PASS')
 } else {
  const a='10000000-0000-0000-0000-000000000001';
  await db.query('insert into auth.users(id,email) values($1,$2)',[a,'a@example.invalid'])
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`)
  const first=await db.query("select * from public.provision_workspace('Synthetic A','synthetic-a')")
  assert.equal(first.rows[0].created,true)
  const again=await db.query("select * from public.provision_workspace('Synthetic A','synthetic-a')")
  assert.equal(again.rows[0].created,false)
  assert.equal(first.rows[0].id,again.rows[0].id)
  await db.exec('reset role')
  await db.query("update public.workspaces set status='suspended' where id=$1",[first.rows[0].id])
  await db.exec('set role authenticated')
  assert.equal((await db.query('select * from public.current_workspace_ids()')).rows.length,0)
  assert.equal((await db.query('select * from public.workspaces')).rows.length,0)
  await assert.rejects(db.query("select * from public.provision_workspace('Bypass','bypass')"))
  await db.exec('reset role')
  const b='10000000-0000-0000-0000-000000000002'
  const c='10000000-0000-0000-0000-000000000003'
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[b,'b@example.invalid',c,'c@example.invalid'])
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${b}',false);`)
  const second=await db.query("select * from public.provision_workspace('Synthetic B','synthetic-b')")
  assert.deepEqual((await db.query('select id from public.workspaces')).rows,[{id:second.rows[0].id}])
  await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`)
  assert.equal((await db.query('select id from public.workspaces')).rows.length,0)
  await db.exec('reset role')
  await db.query("insert into public.workspace_members(workspace_id,user_id,role,status) values($1,$2,'member','active')",[second.rows[0].id,a])
  await db.exec('set role authenticated')
  assert.deepEqual((await db.query('select id from public.workspaces')).rows,[{id:second.rows[0].id}])
  await db.exec('reset role')
  // Current schema represents removed membership by absence, not a status enum.
  await db.query('delete from public.workspace_members where workspace_id=$1 and user_id=$2',[second.rows[0].id,a])
  await db.exec('set role authenticated')
  assert.equal((await db.query('select id from public.workspaces')).rows.length,0)
  await db.exec(`select set_config('request.jwt.claim.sub','${c}',false);`)
  await assert.rejects(db.query("select * from public.provision_workspace('Collision','synthetic-b')"),{code:'23505'})
  await db.exec('reset role')
  assert.equal((await db.query('select id from public.workspace_members where user_id=$1',[c])).rows.length,0)
  assert.deepEqual((await db.query('select workspace_id from public.profiles where id=$1',[c])).rows,[{workspace_id:null}])
  await db.exec(`create function pg_temp.reject_synthetic_profile() returns trigger language plpgsql as $$begin raise exception using errcode='23514',message='synthetic_profile_failure'; end$$;
   create trigger w4_synthetic_profile_failure before insert on public.profiles for each row when (new.id='${c}'::uuid) execute function pg_temp.reject_synthetic_profile();
   set role authenticated;`)
  await assert.rejects(db.query("select * from public.provision_workspace('Rollback','synthetic-rollback')"),{code:'23514'})
  await db.exec('reset role')
  assert.equal((await db.query("select id from public.workspaces where slug='synthetic-rollback'")).rows.length,0)
  assert.equal((await db.query('select id from public.workspace_members where user_id=$1',[c])).rows.length,0)
  assert.deepEqual((await db.query('select workspace_id from public.profiles where id=$1',[c])).rows,[{workspace_id:null}])
  await db.exec("set role anon; select set_config('request.jwt.claim.sub','',false);")
  await assert.rejects(db.query("select * from public.provision_workspace('Anonymous','anonymous')"),{code:'42501'})
  console.log('IDENTITY ONBOARDING/REPLAY/SUSPENSION/CROSS-TENANT/MULTI/REMOVED/COLLISION/ROLLBACK/ANON PASS')
 }
} catch(e) { console.error('DB FAILURE',e.code,e.message); process.exitCode=1 }
finally {await db.close()}
