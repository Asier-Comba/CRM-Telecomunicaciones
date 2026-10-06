-- Append to synthetic_product.sql without COMMIT; all mutations are synthetic and rolled back.
create function pg_temp.assert_attention(ok boolean)returns void language plpgsql as $$begin if ok is not true then raise exception 'attention_assertion';end if;end$$;
create function pg_temp.deny_attention(q text,c text)returns void language plpgsql as $$begin begin execute q;exception when others then if sqlstate=c then return;end if;raise;end;raise exception 'attention_expected_denial';end$$;
create temporary table attention_facts(kind text,id uuid);grant all on attention_facts to authenticated;
do $$declare w uuid:=md5('density.workspace.1')::uuid;c uuid:=md5('density.customer.1.1')::uuid;con uuid:=md5('density.contract.1.1.1')::uuid;svc uuid:=md5('density.service.1.1.1')::uuid;u uuid:=md5('density.actor.1.1')::uuid;t date:=(statement_timestamp()at time zone'Europe/Madrid')::date;i uuid;begin
 i:=gen_random_uuid();insert into public.telecom_renewals(id,workspace_id,contract_id,target_on,created_by_user_id)values(i,w,con,t+10,u);insert into attention_facts values('renewal',i);
 i:=gen_random_uuid();insert into public.telecom_commitments(id,workspace_id,contract_id,service_id,commitment_kind,starts_on,ends_on,reason_code,created_by_user_id)values(i,w,con,svc,'minimum_term',t-20,t+20,'synthetic_term',u);insert into attention_facts values('permanence',i);
 i:=gen_random_uuid();insert into public.service_cases(id,workspace_id,customer_id,contract_id,service_id,case_type,title,priority,assigned_user_id,created_by_user_id)values(i,w,c,con,svc,'technical','Synthetic Attention Case','urgent',u,u);insert into attention_facts values('case',i);
 i:=gen_random_uuid();insert into public.tasks(id,workspace_id,customer_id,title,due_at,assigned_user_id,created_by_user_id)values(i,w,c,'Synthetic Attention Task',statement_timestamp()-interval'1 day',u,u);insert into attention_facts values('task',i);
 i:=gen_random_uuid();insert into public.calendar_events(id,workspace_id,customer_id,title,starts_at,timezone,assigned_user_id,created_by_user_id)values(i,w,c,'Synthetic Attention Meeting',statement_timestamp()+interval'1 day','Europe/Madrid',u,u);insert into attention_facts values('meeting',i);
 i:=gen_random_uuid();insert into public.opportunities(id,workspace_id,customer_id,stage_id,title,owner_user_id,created_by_user_id)values(i,w,c,md5('density.stage.1.1')::uuid,'Synthetic Attention Opportunity',u,u);insert into attention_facts values('opportunity',i);
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
do $$declare w uuid:=md5('density.workspace.1')::uuid;line uuid:=md5('density.line.1.1.1.1')::uuid;p jsonb;ident jsonb;begin
 ident:=public.identifier_v1_command(w,'identifier.create_manual',jsonb_build_object('command_id',gen_random_uuid(),'entity_kind','line','entity_id',line,'identifier_kind','msisdn','canonical_value','+12025550189'));
 p:=public.portability_v1_command(w,'portability.create',jsonb_build_object('command_id',gen_random_uuid(),'line_id',line,'number_identifier_id',ident->>'id','direction','inbound','donor_operator_id',md5('density.operator.1.1')::uuid,'target_operator_id',md5('density.operator.1.2')::uuid,'requested_on',(statement_timestamp()at time zone'Europe/Madrid')::date-1,'owner_user_id',null));
 insert into attention_facts values('portability',(p->>'id')::uuid);
end$$;
do $$declare w uuid:=md5('density.workspace.1')::uuid;c uuid:=md5('density.customer.1.1')::uuid;t date:=(statement_timestamp()at time zone'Europe/Madrid')::date;i jsonb;r jsonb;x jsonb;seen uuid[]:='{}';n int:=0;begin
 i:=jsonb_build_object('customer_id',c,'window_from',t-2,'window_to',t+31,'limit',1);
 loop
 r:=public.telecom_attention_v1_query(w,i);n:=n+1;perform pg_temp.assert_attention(n<200);
 for x in select value from jsonb_array_elements(r->'items')loop
 perform pg_temp.assert_attention((select count(*)from jsonb_object_keys(x))=10 and not x?'title'and not x?'canonical_value');
 seen:=array_append(seen,(x->>'id')::uuid);
 end loop;
 exit when r->'next_cursor'='null'::jsonb;i:=i||(r->'next_cursor');
 end loop;
 perform pg_temp.assert_attention((select count(*)from attention_facts where id=any(seen))=7 and(select count(distinct v)from unnest(seen)v)=cardinality(seen));
 r:=public.telecom_attention_v1_query(w,jsonb_build_object('customer_id',c,'window_from',t-2,'window_to',t+31,'kind','opportunity'));
 perform pg_temp.assert_attention(jsonb_array_length(r->'items')=1 and r->'items'->0->>'reason_code'='opportunity_missing_next_action');
 perform pg_temp.deny_attention(format('select public.telecom_attention_v1_query(%L,%L)',w,jsonb_build_object('window_from',t,'window_to',t+367)::text),'22023');
 perform pg_temp.deny_attention(format('select public.telecom_attention_v1_query(%L,%L)',w,jsonb_build_object('window_from',t,'window_to',t+1,'after_id',c)::text),'22023');
 perform pg_temp.deny_attention(format('select public.telecom_attention_v1_query(%L,%L)',w,jsonb_build_object('window_from',t,'window_to',t+1,'customer_id',md5('density.customer.2.1')::uuid)::text),'P0002');
end$$;
reset role;
update public.workspace_members set role='viewer'where user_id=md5('density.actor.1.3')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.3')::uuid::text,true);
select pg_temp.assert_attention(public.telecom_attention_v1_query(md5('density.workspace.1')::uuid,jsonb_build_object('window_from',(statement_timestamp()at time zone'Europe/Madrid')::date-2,'window_to',(statement_timestamp()at time zone'Europe/Madrid')::date+31))->>'operation'='telecom.attention');
reset role;
update public.workspace_members set status='suspended'where user_id=md5('density.actor.1.1')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('density.actor.1.1')::uuid::text,true);
select pg_temp.deny_attention(format('select public.telecom_attention_v1_query(%L,%L)',md5('density.workspace.1')::uuid,jsonb_build_object('window_from',current_date,'window_to',current_date)::text),'42501');
reset role;
rollback;
