begin;
create table public.product_user_preferences(
 user_id uuid primary key references auth.users(id),version bigint not null check(version>0 and version<1000000000000000),display_name text check(display_name is null or char_length(display_name)between 1 and 100),timezone text not null,locale text not null check(locale in('es-ES','en-GB','en-US')),in_app_notifications boolean not null default true,updated_at timestamptz not null default statement_timestamp()
);
create table public.workspace_company_profiles(
 workspace_id uuid primary key references public.workspaces(id),version bigint not null check(version>0 and version<1000000000000000),
 trade_name text,business_name text,business_email text,phone text,website text,address text,timezone text not null,locale text not null check(locale in('es-ES','en-GB','en-US')),description text,logo_document_id uuid,updated_at timestamptz not null default statement_timestamp(),
 foreign key(logo_document_id,workspace_id)references public.documents(id,workspace_id)
);
alter table public.product_user_preferences enable row level security;alter table public.product_user_preferences force row level security;
alter table public.workspace_company_profiles enable row level security;alter table public.workspace_company_profiles force row level security;
revoke all on public.product_user_preferences,public.workspace_company_profiles from public,anon,authenticated,service_role;
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''settings.profile_update'',''settings.company_update''))';end$$;
create function public.settings_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare p jsonb;k text;v jsonb;allowed text[];lim int;begin
 if inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>8192 then raise exception using errcode='22023',message='settings_invalid_input';end if;
 if op in('settings.profile_get','settings.company_get','settings.integrations')then if inp<>'{}'::jsonb then raise exception using errcode='22023',message='settings_invalid_input';end if;return;end if;
 if op not in('settings.profile_update','settings.company_update')or not inp?'command_id'or not inp?'expected_version'or not inp?'profile'or(select count(*)from jsonb_object_keys(inp))<>3 or jsonb_typeof(inp->'command_id')is distinct from 'string'or inp->>'command_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'or jsonb_typeof(inp->'expected_version')is distinct from 'number'or inp->>'expected_version'!~'^(0|[1-9][0-9]{0,14})$'then raise exception using errcode='22023',message='settings_invalid_input';end if;
 p:=inp->'profile';allowed:=case when op='settings.profile_update'then array['display_name','timezone','locale','notification_preferences']else array['trade_name','business_name','business_email','phone','website','address','timezone','locale','description','logo_document_id']end;
 if jsonb_typeof(p)is distinct from 'object'or exists(select 1 from unnest(allowed)x where not p?x)or exists(select 1 from jsonb_object_keys(p)x where not x=any(allowed))then raise exception using errcode='22023',message='settings_invalid_input';end if;
 for k,v in select key,value from jsonb_each(p)loop
  if k='notification_preferences'then if jsonb_typeof(v)is distinct from 'object'or not v?'in_app'or(select count(*)from jsonb_object_keys(v))<>1 or jsonb_typeof(v->'in_app')is distinct from 'boolean'then raise exception using errcode='22023',message='settings_invalid_input';end if;
  elsif k='timezone'then if jsonb_typeof(v)is distinct from 'string'or char_length(p->>k)>100 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p->>k)then raise exception using errcode='22023',message='settings_invalid_timezone';end if;
  elsif k='locale'then if v not in('"es-ES"'::jsonb,'"en-GB"'::jsonb,'"en-US"'::jsonb)then raise exception using errcode='22023',message='settings_invalid_locale';end if;
  elsif k='logo_document_id'then if v<>'null'::jsonb and(jsonb_typeof(v)is distinct from 'string'or p->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='settings_invalid_logo';end if;
  else if v='null'::jsonb then continue;end if;lim:=case k when 'display_name'then 100 when 'trade_name'then 200 when 'business_name'then 200 when 'business_email'then 320 when 'phone'then 40 when 'website'then 500 when 'address'then 500 when 'description'then 1000 else 0 end;
   if jsonb_typeof(v)is distinct from 'string'or char_length(p->>k)not between 1 and lim or p->>k<>btrim(p->>k)or p->>k~'[\x01-\x1F\x7F]'then raise exception using errcode='22023',message='settings_invalid_input';end if;
   if k='website'and(p->>k!~'^https://[^/@[:space:]]+([/?#]|$)'or p->>k~'[[:space:]]')then raise exception using errcode='22023',message='settings_invalid_website';end if;
   if k='business_email'and p->>k!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'then raise exception using errcode='22023',message='settings_invalid_email';end if;
  end if;
 end loop;end$$;
create function public.settings_v1_command(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;p jsonb;v bigint;prior jsonb;logo uuid;begin
 a:=public.product_v1_assert_scope(w,false);if op='settings.company_update'then perform public.team_v1_assert_scope(w);end if;perform public.settings_v1_validate(op,inp);prior:=public.product_v1_begin_command(w,a,op,inp);if prior is not null then return prior;end if;p:=inp->'profile';
 -- Actor/profile and workspace/company are derived; never accepted in browser input.
 perform pg_advisory_xact_lock(hashtextextended('settings:'||case when op='settings.profile_update'then a::text else w::text end,0));
 if op='settings.profile_update'then
  select version into v from public.product_user_preferences where user_id=a for update;if coalesce(v,0)<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='settings_conflict';end if;v:=coalesce(v,0)+1;
  insert into public.product_user_preferences(user_id,version,display_name,timezone,locale,in_app_notifications)values(a,v,p->>'display_name',p->>'timezone',p->>'locale',(p->'notification_preferences'->>'in_app')::boolean)on conflict(user_id)do update set version=excluded.version,display_name=excluded.display_name,timezone=excluded.timezone,locale=excluded.locale,in_app_notifications=excluded.in_app_notifications,updated_at=statement_timestamp();
 elsif op='settings.company_update'then
  select version into v from public.workspace_company_profiles where workspace_id=w for update;if coalesce(v,0)<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='settings_conflict';end if;v:=coalesce(v,0)+1;logo:=(p->>'logo_document_id')::uuid;
  if logo is not null then perform 1 from public.documents where workspace_id=w and id=logo and status='active'and media_type in('image/png','image/jpeg')for share;if not found then raise exception using errcode='P0002',message='settings_logo_not_found';end if;end if;
  insert into public.workspace_company_profiles(workspace_id,version,trade_name,business_name,business_email,phone,website,address,timezone,locale,description,logo_document_id)values(w,v,p->>'trade_name',p->>'business_name',p->>'business_email',p->>'phone',p->>'website',p->>'address',p->>'timezone',p->>'locale',p->>'description',logo)on conflict(workspace_id)do update set version=excluded.version,trade_name=excluded.trade_name,business_name=excluded.business_name,business_email=excluded.business_email,phone=excluded.phone,website=excluded.website,address=excluded.address,timezone=excluded.timezone,locale=excluded.locale,description=excluded.description,logo_document_id=excluded.logo_document_id,updated_at=statement_timestamp();
 else raise exception using errcode='22023',message='settings_invalid_input';end if;
 prior:=jsonb_build_object('contract_version','settings.v1','operation',op,'command_id',inp->>'command_id','version',v);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(w,a,(inp->>'command_id')::uuid,op,case when op='settings.profile_update'then a else w end,v);update public.product_commands set receipt=prior where workspace_id=w and actor_id=a and command_id=(inp->>'command_id')::uuid;return prior;end$$;
create function public.settings_v1_profile_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;r public.product_user_preferences%rowtype;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.settings_v1_validate('settings.profile_get',p_input);select *into r from public.product_user_preferences where user_id=a;
 return jsonb_build_object('contract_version','settings.v1','operation','settings.profile_get','version',coalesce(r.version,0),'profile',jsonb_build_object('display_name',r.display_name,'timezone',coalesce(r.timezone,'Europe/Madrid'),'locale',coalesce(r.locale,'es-ES'),'notification_preferences',jsonb_build_object('in_app',coalesce(r.in_app_notifications,true))));end$$;
create function public.settings_v1_company_get(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;r public.workspace_company_profiles%rowtype;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.settings_v1_validate('settings.company_get',p_input);select *into r from public.workspace_company_profiles where workspace_id=p_workspace_id;
 if r.logo_document_id is not null and not exists(select 1 from public.documents where workspace_id=p_workspace_id and id=r.logo_document_id and status='active'and media_type in('image/png','image/jpeg'))then r.logo_document_id:=null;end if;
 return jsonb_build_object('contract_version','settings.v1','operation','settings.company_get','version',coalesce(r.version,0),'profile',jsonb_build_object('trade_name',r.trade_name,'business_name',r.business_name,'business_email',r.business_email,'phone',r.phone,'website',r.website,'address',r.address,'timezone',coalesce(r.timezone,'Europe/Madrid'),'locale',coalesce(r.locale,'es-ES'),'description',r.description,'logo_document_id',r.logo_document_id));end$$;
create function public.settings_v1_integrations(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;state text;begin
 a:=public.product_v1_assert_scope(p_workspace_id,false);perform public.settings_v1_validate('settings.integrations',p_input);
 state:=case when exists(select 1 from storage.buckets where id='telecom-documents'and not public and file_size_limit=10485760)then 'configured'else 'unavailable'end;
 return jsonb_build_object('contract_version','settings.v1','operation','settings.integrations','integrations',jsonb_build_array(jsonb_build_object('class','google_calendar','status','not_configured'),jsonb_build_object('class','auth_mail','status','not_configured'),jsonb_build_object('class','crm_mail','status','not_configured'),jsonb_build_object('class','whatsapp','status','not_configured'),jsonb_build_object('class','n8n','status','not_configured'),jsonb_build_object('class','ai_provider','status','not_configured'),jsonb_build_object('class','storage','status',state)));end$$;
create function public.settings_v1_profile_update(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.settings_v1_command(p_workspace_id,'settings.profile_update',p_input)$$;
create function public.settings_v1_company_update(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.settings_v1_command(p_workspace_id,'settings.company_update',p_input)$$;
revoke all on function public.settings_v1_validate(text,jsonb),public.settings_v1_command(uuid,text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.settings_v1_profile_get(uuid,jsonb),public.settings_v1_company_get(uuid,jsonb),public.settings_v1_integrations(uuid,jsonb),public.settings_v1_profile_update(uuid,jsonb),public.settings_v1_company_update(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.settings_v1_profile_get(uuid,jsonb),public.settings_v1_company_get(uuid,jsonb),public.settings_v1_integrations(uuid,jsonb),public.settings_v1_profile_update(uuid,jsonb),public.settings_v1_company_update(uuid,jsonb)to authenticated;
create or replace function public.notification_v1_emit(w uuid,u uuid,k text,target uuid,source text)returns uuid language plpgsql security definer set search_path=''as $$declare v_notification_id uuid;target_kind text;begin
 target_kind:=case k when 'task_overdue'then 'task'when 'customer_created'then 'customer'else null end;
 if target_kind is null or not public.notification_v1_target_access(w,u,target_kind,target)then raise exception using errcode='42501',message='notification_recipient_denied';end if;
 if exists(select 1 from public.product_user_preferences where user_id=u and not in_app_notifications)then return null;end if;
 insert into public.notification_centers(workspace_id,user_id)values(w,u)on conflict do nothing;
 perform 1 from public.notification_centers where workspace_id=w and user_id=u for update;
 insert into public.internal_notifications(workspace_id,recipient_user_id,kind,target_kind,target_id,source_key)values(w,u,k,target_kind,target,source)on conflict(workspace_id,recipient_user_id,kind,source_key)do nothing returning internal_notifications.id into v_notification_id;
 if v_notification_id is not null then update public.notification_centers set version=version+1 where workspace_id=w and user_id=u;else select n.id into v_notification_id from public.internal_notifications n where workspace_id=w and recipient_user_id=u and kind=k and source_key=source;end if;return v_notification_id;end$$;
create or replace function public.notification_v1_command(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;v bigint;prior jsonb;affected int:=0;t record;v_notification_id uuid;has_more boolean:=false;begin
 a:=public.product_v1_assert_scope(w,true);perform public.notification_v1_validate(op,inp);
 prior:=public.product_v1_begin_command(w,a,op,inp);if prior is not null then return prior;end if;
 insert into public.notification_centers(workspace_id,user_id)values(w,a)on conflict do nothing;
 select version into v from public.notification_centers where workspace_id=w and user_id=a for update;
 if v<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='notification_conflict';end if;
 if op='notification.refresh'and not exists(select 1 from public.product_user_preferences where user_id=a and not in_app_notifications)then
  for t in select x.id,x.due_at from public.tasks x where x.workspace_id=w and x.assigned_user_id=a and x.status in('pending','in_progress')and x.due_at<statement_timestamp()
   and not exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.kind='task_overdue'and n.source_key=x.id::text||':'||extract(epoch from x.due_at)::text)
   order by x.id limit 100 for share loop
   if public.notification_v1_emit(w,a,'task_overdue',t.id,t.id::text||':'||extract(epoch from t.due_at)::text)is not null then affected:=affected+1;end if;
  end loop;
 elsif op='notification.refresh'then null;
 elsif op='notification.mark_read'then
  v_notification_id:=(inp->>'id')::uuid;
  perform 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.id=v_notification_id and public.notification_v1_target_access(w,a,n.target_kind,n.target_id)for update;
  if not found then raise exception using errcode='P0002',message='notification_not_found';end if;
  update public.internal_notifications set read_at=coalesce(read_at,statement_timestamp())where internal_notifications.id=v_notification_id;get diagnostics affected=row_count;
 elsif op='notification.mark_all_read'then
  -- Bounded logical batch. Repeat using the returned center version if >100 remain.
  update public.internal_notifications set read_at=statement_timestamp()where internal_notifications.id in(select n.id from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.read_at is null and public.notification_v1_target_access(w,a,n.target_kind,n.target_id)order by n.id limit 100);get diagnostics affected=row_count;
 else raise exception using errcode='22023',message='notification_invalid_input';end if;
 if op='notification.mark_all_read'then select exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.read_at is null and public.notification_v1_target_access(w,a,n.target_kind,n.target_id))into has_more;
 elsif op='notification.refresh'and not exists(select 1 from public.product_user_preferences where user_id=a and not in_app_notifications)then select exists(select 1 from public.tasks x where x.workspace_id=w and x.assigned_user_id=a and x.status in('pending','in_progress')and x.due_at<statement_timestamp()and not exists(select 1 from public.internal_notifications n where n.workspace_id=w and n.recipient_user_id=a and n.kind='task_overdue'and n.source_key=x.id::text||':'||extract(epoch from x.due_at)::text))into has_more;end if;
 -- Refresh emits can increment center multiple times; one command receipt uses the final authoritative center version.
 update public.notification_centers set version=version+1 where workspace_id=w and user_id=a returning version into v;
 prior:=jsonb_build_object('contract_version','notifications.v1','operation',op,'command_id',inp->>'command_id','version',v,'affected',affected,'has_more',has_more);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(w,a,(inp->>'command_id')::uuid,op,a,v);
 update public.product_commands set receipt=prior where workspace_id=w and actor_id=a and command_id=(inp->>'command_id')::uuid;return prior;end$$;
create or replace function public.automation_v1_process_pending(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;d public.internal_automations%rowtype;e public.internal_automation_events%rowtype;prior jsonb;receipt jsonb;effect uuid;failure text;state text;processed int:=0;succeeded int:=0;failed int:=0;skipped int:=0;has_more boolean;child uuid;begin
 a:=public.team_v1_assert_scope(p_workspace_id);perform public.automation_v1_validate('automation.process_pending',p_input);prior:=public.product_v1_begin_command(p_workspace_id,a,'automation.process_pending',p_input);if prior is not null then return prior;end if;
 for e in select x.*from public.internal_automation_events x where x.workspace_id=p_workspace_id and exists(select 1 from public.internal_automations y where y.workspace_id=p_workspace_id and y.enabled and x.created_at>=y.enabled_at and(y.account_kind is null or y.account_kind=x.account_kind)and not exists(select 1 from public.internal_automation_runs r where r.workspace_id=p_workspace_id and r.automation_id=y.id and r.event_id=x.id and r.action_id=y.action_id))order by x.created_at,x.id limit 100 for update skip locked loop
  for d in select y.*from public.internal_automations y where y.workspace_id=p_workspace_id and y.enabled and e.created_at>=y.enabled_at and(y.account_kind is null or y.account_kind=e.account_kind)order by y.id for update loop
   exit when processed>=100;
   if exists(select 1 from public.internal_automation_runs r where r.workspace_id=p_workspace_id and r.automation_id=d.id and r.event_id=e.id and r.action_id=d.action_id)then continue;end if;
   effect:=null;failure:=null;state:='skipped';
   if exists(select 1 from public.customers where workspace_id=p_workspace_id and id=e.entity_id and status='active')then
    begin
     child:=substr(encode(extensions.digest('automation-action-v1:'||d.id::text||':'||e.id::text||':'||d.action_id,'sha256'),'hex'),1,32)::uuid;
     if d.action_id='notification.create'then effect:=public.notification_v1_emit(p_workspace_id,d.recipient_user_id,'customer_created',e.entity_id,'automation:'||d.id::text||':'||e.id::text);
     elsif d.action_id='task.create'then receipt:=public.product_v1_task_create(p_workspace_id,jsonb_build_object('command_id',child,'customer_id',e.entity_id,'title','Seguimiento de cliente','assigned_user_id',d.recipient_user_id));effect:=(receipt->>'id')::uuid;
     else raise exception using errcode='22023',message='automation_unregistered_action';end if;state:=case when effect is null then 'skipped'else 'succeeded'end;
    exception when others then effect:=null;state:='failed';failure:=case sqlstate when '42501'then 'action_denied'when '40001'then 'action_conflict'when '22023'then 'action_invalid'else 'action_unavailable'end;end;
   end if;
   insert into public.internal_automation_runs(workspace_id,automation_id,event_id,action_id,definition_version,status,effect_id,failure_code)values(p_workspace_id,d.id,e.id,d.action_id,d.version,state,effect,failure);
   processed:=processed+1;if state='succeeded'then succeeded:=succeeded+1;elsif state='failed'then failed:=failed+1;else skipped:=skipped+1;end if;
  end loop;exit when processed>=100;
 end loop;
 select exists(select 1 from public.internal_automation_events x join public.internal_automations y on y.workspace_id=x.workspace_id where x.workspace_id=p_workspace_id and y.enabled and x.created_at>=y.enabled_at and(y.account_kind is null or y.account_kind=x.account_kind)and not exists(select 1 from public.internal_automation_runs r where r.workspace_id=p_workspace_id and r.automation_id=y.id and r.event_id=x.id and r.action_id=y.action_id))into has_more;
 prior:=jsonb_build_object('contract_version','automations.v1','operation','automation.process_pending','command_id',p_input->>'command_id','processed',processed,'succeeded',succeeded,'failed',failed,'skipped',skipped,'has_more',has_more);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(p_workspace_id,a,(p_input->>'command_id')::uuid,'automation.process_pending',a,1);
 update public.product_commands set receipt=prior where workspace_id=p_workspace_id and actor_id=a and command_id=(p_input->>'command_id')::uuid;return prior;end$$;
commit;
