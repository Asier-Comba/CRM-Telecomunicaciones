-- Append synthetic_product.sql without COMMIT; all data synthetic and rolled back.
create function pg_temp.assert_location(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'service_location_assertion';end if;end$$;
create function pg_temp.deny_location(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'service_location_expected_denial';end$$;
create temporary table saved_locations(op text,inp jsonb,receipt jsonb);grant all on saved_locations to authenticated;
set local role authenticated;select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;c jsonb;other jsonb;o jsonb;con jsonb;s jsonb;l jsonb;l2 jsonb;i jsonb;r jsonb;begin
 c:=public.product_v1_customer_create(w,jsonb_build_object('command_id',gen_random_uuid(),'account_kind','legal_entity','legal_name','Synthetic Location Customer'));
 other:=public.product_v1_customer_create(w,jsonb_build_object('command_id',gen_random_uuid(),'account_kind','legal_entity','legal_name','Synthetic Other Location Customer'));
 o:=public.catalog_v1_command(w,'operator.create',jsonb_build_object('command_id',gen_random_uuid(),'code','synthetic_location_operator','display_name','Synthetic Location Operator'));
 con:=public.portfolio_v1_contract_create_manual(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c->>'id','operator_id',o->>'id','plan_version_id',null,'start_date','2026-01-01'));
 s:=public.portfolio_v1_service_create_manual(w,jsonb_build_object('command_id',gen_random_uuid(),'contract_id',con->>'id','plan_version_id',null,'service_kind','fiber','display_name','Synthetic Location Fiber'));
 i:=jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c->>'id','label','Synthetic North Site','address_line1','Synthetic Street Must Not Audit 42','address_line2',null,'postal_code','00000','city','Synthetic City','region',null,'country','ES');l:=public.service_location_v1_command(w,'service_location.create',i);insert into saved_locations values('service_location.create',i,l);perform pg_temp.assert_location(l=public.service_location_v1_command(w,'service_location.create',i));
 l2:=public.service_location_v1_command(w,'service_location.create',i||jsonb_build_object('command_id',gen_random_uuid(),'customer_id',other->>'id','label','Synthetic Other Site'));
 i:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s->>'id','location_id',l->>'id','expected_service_version',1,'expected_details_version',0);r:=public.service_location_v1_command(w,'service_location.assign',i);insert into saved_locations values('service_location.assign',i,r);perform pg_temp.assert_location(r->>'version'='1'and r->>'service_version'='2');
 perform pg_temp.deny_location(format('select public.service_location_v1_command(%L,%L,%L)',w,'service_location.assign',(i||jsonb_build_object('command_id',gen_random_uuid()))::text),'40001');
 perform pg_temp.deny_location(format('select public.service_location_v1_command(%L,%L,%L)',w,'service_location.assign',(i||jsonb_build_object('command_id',gen_random_uuid(),'expected_service_version',2,'expected_details_version',1,'location_id',l2->>'id'))::text),'P0002');
 r:=public.service_commercial_v1_query(w,'service.installation_get',jsonb_build_object('service_id',s->>'id'));perform pg_temp.assert_location(r->'installation'->>'location_id'=l->>'id'and r->'activated_on'='null'::jsonb);
 r:=public.service_location_v1_query(w,'service_location.get',jsonb_build_object('id',l->>'id'));perform pg_temp.assert_location(not(r->'record')?'address_line1'and (select count(*)from jsonb_object_keys(r->'record'))=6);
 r:=public.service_location_v1_query(w,'service_location.list',jsonb_build_object('customer_id',c->>'id','limit',1));perform pg_temp.assert_location(jsonb_array_length(r->'items')=1 and r->'next_id'='null'::jsonb);
 r:=public.sensitive_v1_get(w,jsonb_build_object('entity_kind','service_location','entity_id',l->>'id','fields',jsonb_build_array('address_line1','city')));perform pg_temp.assert_location(r->'values'->>'address_line1'='Synthetic Street Must Not Audit 42'and not(r->'values')?'postal_code');
 perform pg_temp.deny_location(format('select public.sensitive_v1_get(%L,%L)',w,jsonb_build_object('entity_kind','service_location','entity_id',l->>'id','fields',jsonb_build_array('label'))::text),'22023');
 -- Unlink is an explicit assignment event; old address and first linkage remain immutable.
 r:=public.service_location_v1_command(w,'service_location.assign',i||jsonb_build_object('command_id',gen_random_uuid(),'location_id',null,'expected_service_version',2,'expected_details_version',1));perform pg_temp.assert_location(r->>'version'='2'and r->>'service_version'='3');
 perform pg_temp.assert_location((select receipt=public.service_location_v1_command(w,op,inp)from saved_locations where op='service_location.assign'));
end$$;
reset role;
select pg_temp.assert_location((select count(*)=2 from public.telecom_service_location_assignments));
select pg_temp.assert_location(not exists(select 1 from public.product_audit_events where to_jsonb(product_audit_events)::text like'%Synthetic Street Must Not Audit%'));
update public.workspace_members set role='viewer'where workspace_id=md5('density.workspace.1')::uuid and user_id=md5('density.actor.1.3')::uuid;
set local role authenticated;select set_config('request.jwt.claim.sub',md5('density.actor.1.3')::uuid::text,true);
do $$declare x record;begin for x in select *from saved_locations loop perform pg_temp.deny_location(format('select public.service_location_v1_command(%L,%L,%L)',md5('density.workspace.1')::uuid,x.op,x.inp::text),'42501');end loop;perform pg_temp.deny_location(format('select public.sensitive_v1_get(%L,%L)',md5('density.workspace.1')::uuid,jsonb_build_object('entity_kind','service_location','entity_id',(select receipt->>'id'from saved_locations where op='service_location.create'),'fields',jsonb_build_array('address_line1'))::text),'42501');end$$;
reset role;update public.workspace_members set status='suspended'where workspace_id=md5('density.workspace.1')::uuid and user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare x record;begin for x in select *from saved_locations loop perform pg_temp.deny_location(format('select public.service_location_v1_command(%L,%L,%L)',md5('density.workspace.1')::uuid,x.op,x.inp::text),'42501');end loop;end$$;
reset role;rollback;
