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
  console.log('IDENTITY ONBOARDING/REPLAY/SUSPENSION PASS')
 }
} catch(e) { console.error('DB FAILURE',e.code,e.message); process.exitCode=1 }
finally {await db.close()}
