import {createRequire} from 'node:module'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import {parseDocumentLibraryInputV2,parseDocumentLibraryPageV2} from '../../src/lib/server/document-library-runtime-v2.ts'
const require=createRequire(resolve('scripts/security/ephemeral-postgres/package.json'))
const {PGlite}=require('@electric-sql/pglite'),{pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto'),{btree_gist}=require('@electric-sql/pglite/contrib/btree_gist')
const db=new PGlite({extensions:{pgcrypto,btree_gist}})
// Optional immutable D1 source is solely for a local RED/GREEN causal pair.
// Every other migration and all test actions/assertions remain identical.
if(process.argv.length!==2&&(process.argv.length!==4||process.argv[2]!=='--d1-source'))throw Error('D1_INVALID_TEST_ARGUMENTS')
const d1Source=process.argv[3]??'supabase/migrations/20261027154155_documents_library_v2.sql'
const report={environment:'EMBEDDED_SQL_ONLY_NOT_AUTH',result:'NOT_RUN',checks:[],storage_88_adopted:false,private_bytes:'OFF',migration_sha256:createHash('sha256').update(readFileSync(d1Source)).digest('hex')}
let phase='bootstrap'
function check(ok,name){report.checks.push({name,result:ok?'PASS':'FAIL'});if(!ok)throw Error('D1_SQL_CHECK_FAILED')}
async function root(source,params=[]){await db.exec('reset role');return db.query(source,params)}
async function as(role,actor){await db.exec('reset role;set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor??''])}
async function call(actor,workspace,value={},role='authenticated'){
 await as(role,actor)
 const r=await db.query('select public.document_library_v2_list($1::uuid,$2::jsonb)as data',[workspace,JSON.stringify(value)]),data=r.rows[0]?.data
 const input=parseDocumentLibraryInputV2(value);check(!!input&&!!parseDocumentLibraryPageV2(input,data),'closed_library_dto');return data
}
async function denied(action,code,name){let observed;try{await action()}catch(e){observed=e.code}check(observed===code,name)}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;
 create table auth.users(id uuid primary key,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid()to anon,authenticated,service_role;set app.environment='test';`)
 await db.exec(readFileSync('scripts/security/ephemeral-postgres/storage-stub.sql','utf8'))
 phase='canonical_then_d1_migration'
 const migrations=readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort()
 check(migrations.length===88&&migrations.at(-1)==='20261027154155_documents_library_v2.sql','base_87_plus_d1_not_storage_88')
 for(const name of migrations)await db.exec(readFileSync(name==='20261027154155_documents_library_v2.sql'?d1Source:'supabase/migrations/'+name,'utf8'))
 phase='unchanged_legacy_rls_fixture_with_library_gate_off'
 await db.exec(readFileSync('supabase/tests/telecom-domain-rls.sql','utf8').replace(/^\\.*$/gm,''))
 check(true,'unchanged_legacy_transactional_rls_mutations_preserved_with_gate_off')
 phase='synthetic_density'
 await db.exec(readFileSync('supabase/seeds/synthetic_product.sql','utf8'))
 const wa=(await root("select id from public.workspaces where slug='synthetic-density-1'")).rows[0].id,wb=(await root("select id from public.workspaces where slug='synthetic-density-2'")).rows[0].id
 const actor=async email=>(await root('select id from auth.users where email=$1',[email])).rows[0].id
 const ownerA=await actor('density-1-1@example.invalid'),memberA=await actor('density-1-2@example.invalid'),ownerB=await actor('density-2-1@example.invalid')
 const adminA=randomUUID(),viewerA=randomUUID(),emptyOwner=randomUUID(),emptyWorkspace=randomUUID()
 await root(`insert into auth.users(id,email)values($1,'d1-admin@example.invalid'),($2,'d1-viewer@example.invalid'),($3,'d1-empty@example.invalid')`,[adminA,viewerA,emptyOwner])
 await root("insert into public.workspaces(id,name,slug)values($1,'D1 empty synthetic','d1-empty-synthetic')",[emptyWorkspace])
 await root("insert into public.workspace_members(workspace_id,user_id,role,status)values($1,$2,'admin','active'),($1,$3,'viewer','active'),($4,$5,'owner','active')",[wa,adminA,viewerA,emptyWorkspace,emptyOwner])
 const customers=(await root('select id from public.customers where workspace_id=$1 order by id',[wa])).rows.map(r=>r.id)
 const ca=customers[0],cb=(await root('select id from public.customers where workspace_id=$1',[wb])).rows[0].id
 const relation=async(table)=>(await root('select id from public.'+table+' where workspace_id=$1 order by id limit 1',[wa])).rows[0].id
 const incident=randomUUID();await root("insert into public.service_cases(id,workspace_id,customer_id,case_type,title)values($1,$2,$3,'documentation','D1 synthetic case')",[incident,wa,ca])
 const targets=[['customer',ca,'customer_id'],['contract',await relation('telecom_contracts'),'contract_id'],['service',await relation('telecom_services'),'service_id'],['line',await relation('telecom_lines'),'line_id'],['service_case',incident,'service_case_id'],['opportunity',await relation('opportunities'),'opportunity_id']]
 const docs=[]
 for(let n=0;n<123;n++){
  const id=randomUUID(),target=targets[n%6],targetId=target[0]==='customer'?customers[n%customers.length]:target[1],time=new Date(Date.UTC(2026,8,1)+Math.floor(n/2)*1000).toISOString()
  await root(`insert into public.documents(id,workspace_id,${target[2]},document_kind,file_name,media_type,size_bytes,storage_path,created_at)values($1,$2,$3,$4,'PRIVATE_D1_UNSEARCHABLE.pdf',$5,1024,$6,$7)`,[id,wa,targetId,n%2?'contract':'general',n%3?'application/pdf':'image/png',wa+'/documents/'+id+'/'+randomUUID(),time]);docs.push(id)
 }
 const foreignDoc=randomUUID();await root("insert into public.documents(id,workspace_id,customer_id,document_kind,file_name,media_type,size_bytes,storage_path)values($1,$2,$3,'general','FOREIGN_PRIVATE_UNSEARCHABLE.pdf','application/pdf',10,$4)",[foreignDoc,wb,cb,wb+'/documents/'+foreignDoc+'/'+randomUUID()])
 phase='legacy_customer_update_with_library_gate_off'
 const customerVersion=(await root('select version from public.customers where id=$1',[ca])).rows[0].version
 await as('authenticated',ownerA)
 const updated=(await db.query('select public.product_v1_customer_update($1,$2::jsonb) as receipt',[wa,JSON.stringify({command_id:randomUUID(),id:ca,expected_version:Number(customerVersion),trade_name:'D1 legitimate owner edit'})])).rows[0].receipt
 check(updated.id===ca&&updated.version===Number(customerVersion)+1,'disabled_library_preserves_existing_authorized_customer_update')
 phase='legacy_document_commands_with_library_gate_off'
 const archived=(await db.query('select public.document_v1_archive($1,$2::jsonb) as receipt',[wa,JSON.stringify({id:docs[0],command_id:randomUUID(),expected_version:1})])).rows[0].receipt
 check(archived.version===2&&archived.status==='archived','disabled_library_preserves_existing_authorized_document_archive')
 const restored=(await db.query('select public.document_v1_restore($1,$2::jsonb) as receipt',[wa,JSON.stringify({id:docs[0],command_id:randomUUID(),expected_version:2})])).rows[0].receipt
 check(restored.version===3&&restored.status==='active','disabled_library_preserves_existing_authorized_document_restore')
 phase='gate_and_privileges'
 await denied(()=>call(ownerA,wa),'PT503','direct_rpc_cannot_bypass_disabled_database_gate')
 for(const role of ['anon','service_role'])await denied(()=>call(ownerA,wa,{},role),'42501','rpc_execute_denied_'+role)
 await as('authenticated',ownerA);await denied(()=>db.query('select key_bytes from documents_library_private.settings'),'42501','key_and_gate_table_closed_to_authenticated')
 await root('update documents_library_private.settings set enabled=true where singleton') // isolated fixture only
 phase='global_inventory'
 const first=await call(ownerA,wa);check(first.total_count===123&&first.items.length===20&&!!first.next_cursor,'global_initial_inventory_without_target')
 check(!JSON.stringify(first).includes('PRIVATE_D1')&&!JSON.stringify(first).includes('storage_path'),'raw_filename_path_never_returned')
 const seen=[],pages=[];let current=first
 while(true){pages.push(current);seen.push(...current.items.map(r=>r.id));if(!current.next_cursor)break;check(pages.length<8,'keyset_progress_bounded');current=await call(ownerA,wa,{cursor:current.next_cursor})}
 check(pages.length===7&&seen.length===123&&new Set(seen).size===123&&docs.every(id=>seen.includes(id)),'all_123_across_customers_and_six_targets_exactly_once')
 const old=await call(ownerA,wa,{query:docs[0].slice(0,8)});check(old.items.length===1&&old.items[0].id===docs[0]&&!first.items.some(r=>r.id===docs[0]),'old_document_found_by_safe_reference_outside_first_page')
 check((await call(ownerA,wa,{query:'UNSEARCHABLE'})).total_count===0,'protected_raw_filename_not_searchable_or_counted')
 const asc=await call(ownerA,wa,{sort:'created_asc'});check(asc.items[0].created_at<=asc.items[1].created_at,'ascending_created_with_uuid_tie_break')
 const combined=await call(ownerA,wa,{document_kind:'contract',format:'pdf',created_from:'2026-09-01T00:00:00.000Z',created_before:'2026-09-01T00:02:00.000Z',sort:'created_asc'})
 check(combined.total_count>0&&combined.items.every(r=>r.document_kind==='contract'&&r.media_type==='application/pdf'),'combined_filters_before_global_pagination_and_count')
 const empty=await call(emptyOwner,emptyWorkspace);check(empty.items.length===0&&empty.total_count===0&&empty.completeness==='complete','actual_empty_workspace_complete_not_unavailable')
 phase='isolation_roles_cursors'
 const b=await call(ownerB,wb);check(b.total_count===1&&b.items[0].id===foreignDoc,'tenant_b_positive')
 check((await call(ownerA,wa,{query:foreignDoc.slice(0,8)})).total_count===0&&(await call(ownerA,wa,{customer_id:cb})).total_count===0&&(await call(ownerA,wa,{target:{kind:'customer',id:cb}})).total_count===0,'foreign_search_filters_target_no_count_leak')
 for(const [who,name]of [[memberA,'member'],[viewerA,'viewer']])await denied(()=>call(who,wa),'42501','current_role_denied_'+name)
 check((await call(adminA,wa)).total_count===123,'admin_positive_current_membership')
 for(const [who,workspace,value,name]of [[ownerB,wb,{cursor:first.next_cursor},'foreign_workspace'],[adminA,wa,{cursor:first.next_cursor},'other_actor'],[ownerA,wa,{cursor:first.next_cursor,sort:'created_asc'},'changed_sort'],[ownerA,wa,{cursor:first.next_cursor,query:'Contrato'},'changed_query'],[ownerA,wa,{cursor:first.next_cursor,limit:100},'changed_limit']])await denied(()=>call(who,workspace,value),'22023','cursor_rejected_'+name)
 const damaged=first.next_cursor.slice(0,40)+(first.next_cursor[40]==='A'?'B':'A')+first.next_cursor.slice(41);await denied(()=>call(ownerA,wa,{cursor:damaged}),'22023','cursor_ciphertext_tampering_rejected')
 const expired=(await root(`select rtrim(translate(replace(encode(extensions.pgp_sym_encrypt((extensions.pgp_sym_decrypt(decode(translate($1,'-_','+/')||repeat('=',(4-length($1)%4)%4),'base64'),encode(s.key_bytes,'hex'))::jsonb||jsonb_build_object('expires_at',statement_timestamp()-interval '1 second'))::text,encode(s.key_bytes,'hex'),'cipher-algo=aes256,compress-algo=0'),'base64'),E'\\n',''),'+/','-_'),'=')token from documents_library_private.settings s where singleton`,[first.next_cursor])).rows[0].token
 await denied(()=>call(ownerA,wa,{cursor:expired}),'22023','authenticated_but_expired_cursor_rejected')
 phase='current_authority_and_live_drift'
 await root("update public.workspace_members set status='suspended'where workspace_id=$1 and user_id=$2",[wa,ownerA]);await denied(()=>call(ownerA,wa),'42501','same_sql_actor_revoked_membership_denied_not_auth_jwt_test')
 await root("update public.workspace_members set status='active'where workspace_id=$1 and user_id=$2",[wa,ownerA]);await denied(()=>call(ownerA,wa,{cursor:first.next_cursor}),'22023','membership_revision_invalidates_prior_cursor_after_restore')
 const fresh=await call(ownerA,wa);await root("update public.customers set trade_name='D1 current authorized label'where workspace_id=$1",[wa]);const relabeled=await call(ownerA,wa,{cursor:fresh.next_cursor});check(relabeled.items.every(r=>!r.context.customer||r.context.customer.label==='D1 current authorized label'),'labels_reauthorized_live_not_cached_snapshot')
 await root("update public.documents set status='archived',archived_at=now()where id=$1",[docs[0]]);const drifted=await call(ownerA,wa,{cursor:fresh.next_cursor});check(drifted.total_count===122&&!drifted.items.some(r=>r.id===docs[0]),'current_status_reauthorized_count_drift_explicit_not_snapshot')
 await root("update public.documents set status='active',archived_at=null where id=$1",[docs[0]])
 await root("update documents_library_private.settings set key_bytes=extensions.gen_random_bytes(32),key_generation=key_generation+1 where singleton");await denied(()=>call(ownerA,wa,{cursor:fresh.next_cursor}),'22023','key_rotation_invalidates_old_cursor');check((await call(ownerA,wa)).total_count===123,'new_cursor_after_rotation_works')
 phase='completed';report.result='PASS';report.migrations=88;report.rows=123;report.targets=6;report.roles=['owner','admin','member','viewer'];report.auth='NOT_RUN_EMBEDDED_SQL_ONLY'
}catch(error){report.result='FAIL';report.phase=phase;report.error=/^D1_[A-Z_]+$/.test(error?.message??'')?error.message:'D1_SQL_SAFE_FAILURE';report.sqlstate=/^[A-Z0-9]{5}$/.test(error?.code??'')?error.code:null;report.permission_error=/^permission denied for (function|table|schema) [a-z0-9_]+$/.test(error?.message??'')?error.message:null;process.exitCode=1}
finally{await db.close();report.passed=report.checks.filter(c=>c.result==='PASS').length;console.log(JSON.stringify(report));if(process.env.DOCUMENTS_GLOBAL_SQL_OUTPUT)writeFileSync(process.env.DOCUMENTS_GLOBAL_SQL_OUTPUT,JSON.stringify(report,null,2)+'\n')}
