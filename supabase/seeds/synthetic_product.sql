-- Deterministic disposable product density. No real fiscal/line identifiers.
-- Run only on an isolated database with app.environment=test. Non-idempotent:
-- an existing fixture rejects atomically rather than altering user records.
do $$ begin
 if current_setting('app.environment',true) is distinct from 'test' then
  raise exception using errcode='42501',message='synthetic seed requires disposable test database';
 end if;
end $$;
begin;
do $$
declare w uuid; actor uuid; cust uuid; op uuid; plan uuid; pv uuid;
 con uuid; svc uuid; stage uuid; opp uuid; assigned uuid;
 t timestamptz := '2026-10-04T10:00:00Z';
begin
 for tenant in 1..2 loop
  w:=md5('density.workspace.'||tenant)::uuid;
  insert into public.workspaces(id,name,slug,status) values(w,'Synthetic Density '||tenant,'synthetic-density-'||tenant,'active');
  for person in 1..case when tenant=1 then 3 else 1 end loop
   actor:=md5('density.actor.'||tenant||'.'||person)::uuid;
   insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values(actor,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','density-'||tenant||'-'||person||'@example.invalid','',t,'{}','{}',t,t);
   insert into public.workspace_members(id,workspace_id,user_id,role,status)
    values(md5('density.member.'||tenant||'.'||person)::uuid,w,actor,case when person=1 then 'owner' else 'member' end,'active');
  end loop;
  actor:=md5('density.actor.'||tenant||'.1')::uuid;
  for catalog in 1..3 loop
   op:=md5('density.operator.'||tenant||'.'||catalog)::uuid;
   plan:=md5('density.plan.'||tenant||'.'||catalog)::uuid;
   pv:=md5('density.revision.'||tenant||'.'||catalog)::uuid;
   insert into public.telecom_operators(id,workspace_id,code,display_name,created_by_user_id,created_at,updated_at)
    values(op,w,'synthetic_'||catalog,'Synthetic Operator '||catalog,actor,t,t);
   insert into public.telecom_plans(id,workspace_id,operator_id,code,display_name,service_kind,created_by_user_id,created_at,updated_at)
    values(plan,w,op,'synthetic_mobile','Synthetic Mobile '||catalog,'mobile',actor,t,t);
   insert into public.telecom_plan_versions(id,workspace_id,plan_id,version_number,valid_from,currency,recurring_amount_minor,created_by_user_id,created_at)
    values(pv,w,plan,1,'2026-01-01','EUR',1500+catalog*250,actor,t);
   insert into public.opportunity_stages(id,workspace_id,code,display_name,position,outcome,created_by_user_id,created_at,updated_at)
    values(md5('density.stage.'||tenant||'.'||catalog)::uuid,w,'density_'||catalog,
      case catalog when 1 then 'Synthetic open' when 2 then 'Synthetic won' else 'Synthetic lost' end,catalog-1,
      case catalog when 2 then 'won' when 3 then 'lost' end,actor,t,t);
  end loop;
  for company in 1..case when tenant=1 then 24 else 1 end loop
   cust:=md5('density.customer.'||tenant||'.'||company)::uuid;
   assigned:=md5('density.actor.'||tenant||'.'||case when tenant=1 then 1+(company%3) else 1 end)::uuid;
   insert into public.customers(id,workspace_id,account_kind,legal_name,trade_name,lifecycle,status,assigned_user_id,created_by_user_id,created_at,updated_at)
    values(cust,w,'legal_entity','Synthetic Company '||tenant||'-'||lpad(company::text,2,'0'),'Synthetic Company '||tenant||'-'||lpad(company::text,2,'0'),
      case when company%5=0 then 'prospect' else 'customer' end,case when company%7=0 then 'inactive' else 'active' end,assigned,actor,t,t);
   for contact in 1..2 loop
    insert into public.contacts(id,workspace_id,customer_id,display_name,job_title,email,is_primary,created_by_user_id,created_at,updated_at)
     values(md5('density.contact.'||tenant||'.'||company||'.'||contact)::uuid,w,cust,'Synthetic Contact '||company||'-'||contact,
      case contact when 1 then 'Synthetic purchasing' else 'Synthetic operations' end,'contact-'||tenant||'-'||company||'-'||contact||'@example.invalid',contact=1,actor,t,t);
   end loop;
   for bundle in 1..2 loop
    op:=md5('density.operator.'||tenant||'.'||(1+(company%3)))::uuid;
    pv:=md5('density.revision.'||tenant||'.'||(1+(company%3)))::uuid;
    con:=md5('density.contract.'||tenant||'.'||company||'.'||bundle)::uuid;
    svc:=md5('density.service.'||tenant||'.'||company||'.'||bundle)::uuid;
    insert into public.telecom_contracts(id,workspace_id,customer_id,operator_id,plan_version_id,status,start_date,signed_date,assigned_user_id,created_by_user_id,created_at,updated_at)
     values(con,w,cust,op,pv,'active','2026-01-01','2026-01-01',assigned,actor,t,t);
    insert into public.telecom_services(id,workspace_id,customer_id,contract_id,operator_id,plan_version_id,service_kind,display_name,status,activated_on,created_by_user_id,created_at,updated_at)
     values(svc,w,cust,con,op,pv,'mobile','Synthetic Mobile '||company||'-'||bundle,'active','2026-01-01',actor,t,t);
    for line in 1..8 loop
     insert into public.telecom_lines(id,workspace_id,service_id,status,activated_on,created_by_user_id,created_at,updated_at)
      values(md5('density.line.'||tenant||'.'||company||'.'||bundle||'.'||line)::uuid,w,svc,
       case when line=8 then 'suspended' else 'active' end,'2026-01-01',actor,t,t);
    end loop;
    insert into public.telecom_commitments(id,workspace_id,contract_id,service_id,commitment_kind,starts_on,ends_on,reason_code,created_by_user_id,created_at,updated_at)
     values(md5('density.commitment.'||tenant||'.'||company||'.'||bundle)::uuid,w,con,svc,'minimum_term','2026-01-01','2026-10-01'::date+company,'synthetic_term',actor,t,t);
    insert into public.telecom_renewals(id,workspace_id,contract_id,target_on,opens_on,closes_on,created_by_user_id,created_at,updated_at)
     values(md5('density.renewal.'||tenant||'.'||company||'.'||bundle)::uuid,w,con,'2026-10-01'::date+company,'2026-09-01','2026-11-30',actor,t,t);
   end loop;
   for deal in 1..4 loop
    opp:=md5('density.opportunity.'||tenant||'.'||company||'.'||deal)::uuid;
    stage:=md5('density.stage.'||tenant||'.'||case deal when 3 then 2 when 4 then 3 else 1 end)::uuid;
    insert into public.opportunities(id,workspace_id,customer_id,stage_id,title,status,owner_user_id,amount_minor,currency,expected_close_date,next_action,closed_at,close_reason_code,created_by_user_id,created_at,updated_at)
     values(opp,w,cust,stage,'Synthetic Opportunity '||company||'-'||deal,
      case deal when 3 then 'won' when 4 then 'lost' else 'open' end,assigned,10000+company*100+deal,'EUR','2026-10-31','Synthetic follow-up',
      case when deal>=3 then t end,case when deal=4 then 'synthetic_declined' end,actor,t,t);
   end loop;
   for item in 1..6 loop
    insert into public.tasks(id,workspace_id,customer_id,title,status,priority,due_at,assigned_user_id,completed_at,cancelled_at,created_by_user_id,created_at,updated_at)
     values(md5('density.task.'||tenant||'.'||company||'.'||item)::uuid,w,cust,'Synthetic Task '||company||'-'||item,
      case item when 5 then 'completed' when 6 then 'cancelled' when 4 then 'in_progress' else 'pending' end,
      case when item=1 then 'high' else 'normal' end,t+(company-12)*interval '1 day'+item*interval '1 hour',assigned,
      case when item=5 then t end,case when item=6 then t end,actor,t,t);
   end loop;
   for event in 1..3 loop
    insert into public.calendar_events(id,workspace_id,customer_id,title,status,channel,starts_at,ends_at,timezone,assigned_user_id,completed_at,created_by_user_id,created_at,updated_at)
     values(md5('density.meeting.'||tenant||'.'||company||'.'||event)::uuid,w,cust,'Synthetic Meeting '||company||'-'||event,
      case when event=3 then 'completed' else 'scheduled' end,'video',t+(company-12)*interval '1 day'+event*interval '2 hours',
      t+(company-12)*interval '1 day'+event*interval '2 hours'+interval '1 hour','Europe/Madrid',assigned,case when event=3 then t end,actor,t,t);
   end loop;
   perform set_config('request.jwt.claim.sub',assigned::text,true);
   insert into public.activities(id,workspace_id,customer_id,activity_kind,summary_code,actor_kind,actor_user_id,source,occurred_at,created_by_user_id,created_at)
    values(md5('density.activity.'||tenant||'.'||company)::uuid,w,cust,'created','entity.created','user',assigned,'manual',t+company*interval '1 minute',actor,t);
  end loop;
 end loop;
end $$;
commit;
