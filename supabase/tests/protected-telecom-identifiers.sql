-- After synthetic_product.sql with COMMIT omitted; all fixtures roll back.
create function pg_temp.assert_i(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'identifier_assertion';end if;end$$;
create function pg_temp.deny_i(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'identifier_expected_denial';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;l uuid:=md5('density.line.1.1.1.1')::uuid;i jsonb;r jsonb;id uuid;begin
 i:=jsonb_build_object('command_id',md5('tel5.identifier.command.1')::uuid,'entity_kind','line','entity_id',l,'identifier_kind','msisdn','canonical_value','+12025550123');
 r:=public.identifier_v1_command(w,'identifier.create_manual',i);id:=(r->>'id')::uuid;
 perform pg_temp.assert_i(r->>'version'='1'and r->>'status'='active'and r=public.identifier_v1_command(w,'identifier.create_manual',i));
 perform pg_temp.assert_i(r::text not like '%12025550123%');
 perform pg_temp.assert_i(public.identifier_v1_query(w,'identifier.get',jsonb_build_object('id',id))->'record'->>'masked_display'='••••123');
 perform pg_temp.assert_i(public.identifier_v1_query(w,'identifier.list',jsonb_build_object('entity_kind','line','entity_id',l))->'items'->0->>'id'=id::text);
 perform pg_temp.assert_i(public.sensitive_v1_get(w,jsonb_build_object('entity_kind','telecom_identifier','entity_id',id,'fields',jsonb_build_array('canonical_value')))->'values'->>'canonical_value'='+12025550123');
 perform pg_temp.deny_i(format('select public.identifier_v1_command(%L,%L,%L)',w,'identifier.create_manual',(i||jsonb_build_object('command_id',gen_random_uuid()))::text),'40001');
 perform pg_temp.deny_i(format('select public.identifier_v1_command(%L,%L,%L)',w,'identifier.create_manual',(i||jsonb_build_object('command_id',gen_random_uuid(),'canonical_value','2025550123'))::text),'22023');
 perform pg_temp.deny_i(format('select public.identifier_v1_command(%L,%L,%L)',w,'identifier.create_manual',(i||jsonb_build_object('command_id',gen_random_uuid(),'entity_id',md5('density.line.2.1.1.1')::uuid))::text),'P0002');
 i:=jsonb_build_object('command_id',md5('tel5.identifier.command.2')::uuid,'id',id,'expected_version',1);
 r:=public.identifier_v1_command(w,'identifier.retire',i);perform pg_temp.assert_i(r->>'version'='2'and r->>'status'='retired'and r=public.identifier_v1_command(w,'identifier.retire',i));
 perform pg_temp.deny_i(format('select public.identifier_v1_command(%L,%L,%L)',w,'identifier.retire',(i||jsonb_build_object('command_id',gen_random_uuid()))::text),'40001');
 -- Reassignment creates another row and preserves the prior retired identity.
 perform public.identifier_v1_command(w,'identifier.create_manual',jsonb_build_object('command_id',gen_random_uuid(),'entity_kind','line','entity_id',l,'identifier_kind','msisdn','canonical_value','+12025550124'));
 perform pg_temp.assert_i(jsonb_array_length(public.identifier_v1_query(w,'identifier.list',jsonb_build_object('entity_kind','line','entity_id',l))->'items')=2);
 perform pg_temp.deny_i('select canonical_value from public.telecom_identifiers','42501');
end$$;
reset role;
select pg_temp.assert_i(not exists(select 1 from public.product_commands where operation like 'identifier.%'and receipt::text like '%1202555012%'));
select pg_temp.assert_i(not exists(select 1 from public.product_audit_events where row_to_json(product_audit_events)::text like '%1202555012%'));
select pg_temp.assert_i(not exists(select 1 from public.product_reveal_audit_events where row_to_json(product_reveal_audit_events)::text like '%1202555012%'));
select pg_temp.assert_i((select count(*)=1 from public.product_reveal_audit_events where entity_kind='telecom_identifier'));
select pg_temp.deny_i('update public.telecom_identifiers set canonical_value=''+12025550999''','55000');
select pg_temp.deny_i('delete from public.telecom_identifiers','55000');
update public.workspace_members set status='suspended'where workspace_id=md5('density.workspace.1')::uuid and user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
select pg_temp.deny_i(format('select public.identifier_v1_query(%L,%L,%L)',md5('density.workspace.1')::uuid,'identifier.list',jsonb_build_object('entity_kind','line','entity_id',md5('density.line.1.1.1.1')::uuid)::text),'42501');
select pg_temp.deny_i(format('select public.identifier_v1_command(%L,%L,%L)',md5('density.workspace.1')::uuid,'identifier.create_manual',jsonb_build_object('command_id',md5('tel5.identifier.command.1')::uuid,'entity_kind','line','entity_id',md5('density.line.1.1.1.1')::uuid,'identifier_kind','msisdn','canonical_value','+12025550123')::text),'42501');
reset role;
rollback;
