-- Append synthetic_product.sql without COMMIT. Commercial facts are synthetic; rollback.
create function pg_temp.assert_service_commercial(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'service_commercial_assertion';end if;end$$;
create function pg_temp.deny_service_commercial(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'service_commercial_expected_denial';end$$;
create temporary table saved_service_commercial(op text,inp jsonb,receipt jsonb);grant all on saved_service_commercial to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;o jsonb;p jsonb;v jsonb;c jsonb;con jsonb;s jsonb;mobile jsonb;contact jsonb;i jsonb;r jsonb;old_addon jsonb;new_addon jsonb;hist jsonb;begin
 o:=public.catalog_v1_command(w,'operator.create',jsonb_build_object('command_id',gen_random_uuid(),'code','synthetic_service_history','display_name','Synthetic Service Operator'));
 p:=public.catalog_v1_command(w,'plan.create',jsonb_build_object('command_id',gen_random_uuid(),'operator_id',o->>'id','code','synthetic_service_bundle','display_name','Synthetic Fixed Mobile Bundle','service_kind','fiber'));
 v:=public.catalog_v1_command(w,'plan_version.create',jsonb_build_object('command_id',gen_random_uuid(),'plan_id',p->>'id','expected_version',1,'valid_from','2026-01-01','valid_until',null,'currency','EUR','recurring_amount_minor','4900','one_time_amount_minor','9900','is_bundle',true,'components','[{"component_kind":"base","service_kind":"fiber","addon_code":null,"quantity":1},{"component_kind":"base","service_kind":"mobile","addon_code":null,"quantity":1},{"component_kind":"add_on","service_kind":"fiber","addon_code":"static_ip","quantity":2}]'::jsonb,'entitlements','[{"code":"download_mbps","component_position":1,"integer_value":"600","boolean_value":null,"text_value":null},{"code":"upload_mbps","component_position":1,"integer_value":"600","boolean_value":null,"text_value":null},{"code":"access_technology","component_position":1,"integer_value":null,"boolean_value":null,"text_value":"fiber_ftth"}]'::jsonb));
 c:=public.product_v1_customer_create(w,jsonb_build_object('command_id',gen_random_uuid(),'account_kind','legal_entity','legal_name','Synthetic Installation Customer'));
 con:=public.portfolio_v1_contract_create_manual(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c->>'id','operator_id',o->>'id','plan_version_id',v->>'id','start_date','2026-01-01'));
 s:=public.portfolio_v1_service_create_manual(w,jsonb_build_object('command_id',gen_random_uuid(),'contract_id',con->>'id','plan_version_id',v->>'id','service_kind','fiber','display_name','Synthetic Fiber Service'));
 mobile:=public.portfolio_v1_service_create_manual(w,jsonb_build_object('command_id',gen_random_uuid(),'contract_id',con->>'id','plan_version_id',v->>'id','service_kind','mobile','display_name','Synthetic Bundle Mobile'));
 contact:=public.product_v1_contact_create(w,jsonb_build_object('command_id',gen_random_uuid(),'customer_id',c->>'id','display_name','Synthetic Installer Contact'));
 r:=public.service_commercial_v1_query(w,'service.installation_get',jsonb_build_object('service_id',s->>'id'));perform pg_temp.assert_service_commercial(r->'installation'='null'::jsonb and r->'activated_on'='null'::jsonb);
 i:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s->>'id','expected_service_version',1,'expected_details_version',0,'site_label','Synthetic Northern Site','installation_contact_id',contact->>'id','activation_target_on','2026-10-20');
 r:=public.service_commercial_v1_command(w,'service.installation_set',i);insert into saved_service_commercial values('service.installation_set',i,r);perform pg_temp.assert_service_commercial(r->>'service_version'='2'and r->>'version'='1'and r=public.service_commercial_v1_command(w,'service.installation_set',i));
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.installation_set',(i||jsonb_build_object('command_id',gen_random_uuid()))::text),'40001');
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.installation_set',(i||jsonb_build_object('command_id',gen_random_uuid(),'service_id',mobile->>'id'))::text),'22023');
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.installation_set',(i||jsonb_build_object('command_id',gen_random_uuid(),'expected_service_version',2,'expected_details_version',1,'installation_contact_id',md5('density.contact.1.1.1')::uuid))::text),'P0002');
 r:=public.service_commercial_v1_query(w,'service.installation_get',jsonb_build_object('service_id',s->>'id'));perform pg_temp.assert_service_commercial(r->'installation'->>'site_label'='Synthetic Northern Site'and r->'installation'->>'installation_contact_id'=contact->>'id'and r->'activated_on'='null'::jsonb);
 i:=i||jsonb_build_object('command_id',gen_random_uuid(),'expected_service_version',2,'expected_details_version',1,'activation_target_on','2026-10-21');r:=public.service_commercial_v1_command(w,'service.installation_set',i);perform pg_temp.assert_service_commercial(r->>'service_version'='3'and r->>'version'='2');
 i:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s->>'id','expected_service_version',3,'component_position',3,'quantity',1,'valid_from','2026-01-01','valid_until','2027-12-31');old_addon:=public.service_commercial_v1_command(w,'service.addon_assign',i);insert into saved_service_commercial values('service.addon_assign',i,old_addon);perform pg_temp.assert_service_commercial(old_addon->>'service_version'='4'and old_addon=public.service_commercial_v1_command(w,'service.addon_assign',i));
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.addon_assign',(i||jsonb_build_object('command_id',gen_random_uuid(),'expected_service_version',4))::text),'40001');
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.addon_assign',(i||jsonb_build_object('command_id',gen_random_uuid(),'expected_service_version',4,'component_position',1))::text),'22023');
 i:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s->>'id','id',old_addon->>'id','expected_service_version',4,'expected_version',1,'ended_on','2026-10-05');r:=public.service_commercial_v1_command(w,'service.addon_end',i);insert into saved_service_commercial values('service.addon_end',i,r);perform pg_temp.assert_service_commercial(r->>'service_version'='5'and r->>'version'='2');
 i:=jsonb_build_object('command_id',gen_random_uuid(),'service_id',s->>'id','expected_service_version',5,'component_position',3,'quantity',2,'valid_from','2026-10-06','valid_until',null);new_addon:=public.service_commercial_v1_command(w,'service.addon_assign',i);perform pg_temp.assert_service_commercial(new_addon->>'service_version'='6'and new_addon->>'id'<>old_addon->>'id');
 hist:=public.service_commercial_v1_query(w,'service.addon_list',jsonb_build_object('service_id',s->>'id'));perform pg_temp.assert_service_commercial(jsonb_array_length(hist->'items')=2 and(select count(*)from jsonb_array_elements(hist->'items')where value->>'addon_code'='static_ip')=2 and(select count(*)from jsonb_array_elements(hist->'items')where value->>'ended_on'='2026-10-05')=1);
 r:=public.service_commercial_v1_query(w,'service.addon_list',jsonb_build_object('service_id',s->>'id','limit',1));perform pg_temp.assert_service_commercial(r->>'next_id'is not null);hist:=public.service_commercial_v1_query(w,'service.addon_list',jsonb_build_object('service_id',s->>'id','limit',1,'after_id',r->>'next_id'));perform pg_temp.assert_service_commercial(jsonb_array_length(hist->'items')=1 and hist->'next_id'='null'::jsonb);
 for i,r in select inp,receipt from saved_service_commercial loop perform pg_temp.assert_service_commercial(r=public.service_commercial_v1_command(w,r->>'operation',i));end loop;
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_query(%L,%L,%L)',md5('density.workspace.2')::uuid,'service.installation_get',jsonb_build_object('service_id',s->>'id')),'42501');
end$$;
reset role;
do $$declare w uuid:=md5('density.workspace.1')::uuid;customer uuid:=md5('density.customer.1.1')::uuid;operator uuid:=md5('density.operator.1.1')::uuid;con uuid;svc uuid;begin
 insert into public.telecom_contracts(workspace_id,customer_id,operator_id,start_date,source,created_by_user_id)values(w,customer,operator,'2026-01-01','integration',md5('density.actor.1.1')::uuid)returning id into con;
 insert into public.telecom_services(workspace_id,customer_id,operator_id,contract_id,service_kind,display_name,created_by_user_id)values(w,customer,operator,con,'fiber','Synthetic Integration Fiber',md5('density.actor.1.1')::uuid)returning id into svc;
 perform set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,'service.installation_set',jsonb_build_object('command_id',gen_random_uuid(),'service_id',svc,'expected_service_version',1,'expected_details_version',0,'site_label',null,'installation_contact_id',null,'activation_target_on',null)),'42501');
end$$;
update public.workspace_members set role='viewer'where user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
do $$declare r jsonb;i jsonb;w uuid:=md5('density.workspace.1')::uuid;sid uuid;begin
 select(inp->>'service_id')::uuid into sid from saved_service_commercial limit 1;
 perform pg_temp.assert_service_commercial(public.service_commercial_v1_query(w,'service.installation_get',jsonb_build_object('service_id',sid))->>'service_id'=sid::text);
 perform pg_temp.assert_service_commercial(jsonb_array_length(public.service_commercial_v1_query(w,'service.addon_list',jsonb_build_object('service_id',sid))->'items')=2);
 for i,r in select inp,receipt from saved_service_commercial loop perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,r->>'operation',i),'42501');end loop;
end$$;
reset role;
update public.workspace_members set status='suspended'where user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
do $$declare r jsonb;i jsonb;w uuid:=md5('density.workspace.1')::uuid;sid uuid;begin
 select(inp->>'service_id')::uuid into sid from saved_service_commercial limit 1;
 for i,r in select inp,receipt from saved_service_commercial loop perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_command(%L,%L,%L)',w,r->>'operation',i),'42501');end loop;
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_query(%L,%L,%L)',w,'service.installation_get',jsonb_build_object('service_id',sid)),'42501');
 perform pg_temp.deny_service_commercial(format('select public.service_commercial_v1_query(%L,%L,%L)',w,'service.addon_list',jsonb_build_object('service_id',sid)),'42501');
end$$;
reset role;rollback;
