begin;
create table public.internal_automations(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),name text not null check(char_length(name)between 1 and 100 and name=btrim(name)),
 trigger_id text not null check(trigger_id='customer.created'),account_kind text check(account_kind in('legal_entity','sole_trader')),
 action_id text not null check(action_id in('notification.create','task.create')),recipient_user_id uuid not null references auth.users(id),enabled boolean not null default false,enabled_at timestamptz,
 version bigint not null default 1 check(version>0 and version<1000000000000000),created_by_user_id uuid not null references auth.users(id),created_at timestamptz not null default statement_timestamp(),updated_at timestamptz not null default statement_timestamp(),check(enabled=(enabled_at is not null)),unique(id,workspace_id)
);
create trigger internal_automations_version before update on public.internal_automations for each row execute function public.manage_task_version();
create trigger internal_automations_identity before update on public.internal_automations for each row execute function public.protect_operational_identity();
create table public.internal_automation_events(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),event_id text not null check(event_id='customer.created'),entity_id uuid not null,account_kind text not null check(account_kind in('legal_entity','sole_trader')),
 created_at timestamptz not null default statement_timestamp(),unique(id,workspace_id),unique(workspace_id,event_id,entity_id)
);
create trigger internal_automation_events_immutable before update or delete on public.internal_automation_events for each row execute function public.reject_activity_mutation();
create table public.internal_automation_runs(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),automation_id uuid not null,event_id uuid not null,
 action_id text not null check(action_id in('notification.create','task.create')),definition_version bigint not null,
 status text not null check(status in('succeeded','failed','skipped')),effect_id uuid,failure_code text check(failure_code in('action_denied','action_conflict','action_invalid','action_unavailable','target_unavailable')),
 created_at timestamptz not null default statement_timestamp(),unique(workspace_id,automation_id,event_id,action_id),foreign key(automation_id,workspace_id)references public.internal_automations(id,workspace_id),foreign key(event_id,workspace_id)references public.internal_automation_events(id,workspace_id),
 check((status='succeeded')=(effect_id is not null)),check((status='failed')=(failure_code is not null))
);
create trigger internal_automation_runs_immutable before update or delete on public.internal_automation_runs for each row execute function public.reject_activity_mutation();
alter table public.internal_automations enable row level security;alter table public.internal_automations force row level security;
alter table public.internal_automation_events enable row level security;alter table public.internal_automation_events force row level security;
alter table public.internal_automation_runs enable row level security;alter table public.internal_automation_runs force row level security;
revoke all on public.internal_automations,public.internal_automation_events,public.internal_automation_runs from public,anon,authenticated,service_role;
create index internal_automation_event_scope on public.internal_automation_events(workspace_id,created_at,id);
create index internal_automation_run_scope on public.internal_automation_runs(workspace_id,automation_id,id);
create function public.automation_v1_capture_customer()returns trigger language plpgsql security definer set search_path=''as $$begin
 insert into public.internal_automation_events(workspace_id,event_id,entity_id,account_kind)values(new.workspace_id,'customer.created',new.id,new.account_kind);return new;end$$;
create trigger automation_customer_created after insert on public.customers for each row execute function public.automation_v1_capture_customer();
do $$declare expr text;begin select pg_get_expr(conbin,conrelid)into expr from pg_constraint where conrelid='public.product_commands'::regclass and conname='product_commands_operation_check';alter table public.product_commands drop constraint product_commands_operation_check;execute 'alter table public.product_commands add constraint product_commands_operation_check check(('||expr||')or operation in(''automation.create'',''automation.update'',''automation.enable'',''automation.disable'',''automation.process_pending''))';end$$;
create function public.automation_v1_validate(op text,inp jsonb)returns void language plpgsql set search_path=''as $$declare required text[];optional text[]:=array[]::text[];k text;v jsonb;begin
 required:=case when op='automation.create'then array['command_id','name','trigger_id','condition','action']when op='automation.update'then array['command_id','id','expected_version','name','trigger_id','condition','action']when op in('automation.enable','automation.disable')then array['command_id','id','expected_version']when op='automation.process_pending'then array['command_id']when op in('automation.get','automation.run_history')then array['id']when op='automation.list'then array[]::text[]else null end;
 if op in('automation.list','automation.run_history')then optional:=array['limit','after_id'];end if;
 if required is null or inp is null or jsonb_typeof(inp)<>'object'or octet_length(inp::text)>8192 or exists(select 1 from unnest(required)x where not inp?x)or exists(select 1 from jsonb_object_keys(inp)x where not x=any(required||optional))then raise exception using errcode='22023',message='automation_invalid_input';end if;
 for k,v in select key,value from jsonb_each(inp)loop
  if k in('command_id','id','after_id')then if jsonb_typeof(v)is distinct from 'string'or inp->>k!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='automation_invalid_input';end if;
  elsif k='expected_version'then if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^[1-9][0-9]{0,14}$'then raise exception using errcode='22023',message='automation_invalid_input';end if;
  elsif k='limit'then if jsonb_typeof(v)is distinct from 'number'or inp->>k!~'^[1-9][0-9]{0,2}$'or(inp->>k)::int>100 then raise exception using errcode='22023',message='automation_invalid_input';end if;
  elsif k='name'then if jsonb_typeof(v)is distinct from 'string'or char_length(inp->>k)not between 1 and 100 or inp->>k<>btrim(inp->>k)or inp->>k~'[\x01-\x1F\x7F]'then raise exception using errcode='22023',message='automation_invalid_input';end if;
  elsif k='trigger_id'then if v is distinct from '"customer.created"'::jsonb then raise exception using errcode='22023',message='automation_unregistered_trigger';end if;
  elsif k='condition'then if jsonb_typeof(v)is distinct from 'object'or not v?'account_kind'or(select count(*)from jsonb_object_keys(v))<>1 or (v->'account_kind'='null'::jsonb or v->>'account_kind'in('legal_entity','sole_trader'))is not true then raise exception using errcode='22023',message='automation_invalid_condition';end if;
  elsif k='action'then if jsonb_typeof(v)is distinct from 'object'or(select count(*)from jsonb_object_keys(v))<>2 or not v?'action_id'or not v?'recipient_user_id'or v->'action_id'not in('"notification.create"'::jsonb,'"task.create"'::jsonb)or jsonb_typeof(v->'recipient_user_id')is distinct from 'string'or v->>'recipient_user_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then raise exception using errcode='22023',message='automation_unregistered_action';end if;end if;
 end loop;end$$;
create function public.automation_v1_metadata(d public.internal_automations)returns jsonb language sql stable set search_path=''as $$select jsonb_build_object('id',d.id,'version',d.version,'name',d.name,'trigger_id',d.trigger_id,'condition',jsonb_build_object('account_kind',d.account_kind),'action',jsonb_build_object('action_id',d.action_id,'recipient_user_id',d.recipient_user_id),'enabled',d.enabled,'created_at',d.created_at,'updated_at',d.updated_at)$$;
create function public.automation_v1_command(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;d public.internal_automations%rowtype;prior jsonb;recipient uuid;begin
 a:=public.team_v1_assert_scope(w);perform public.automation_v1_validate(op,inp);prior:=public.product_v1_begin_command(w,a,op,inp);if prior is not null then return prior;end if;
 if op in('automation.create','automation.update')then recipient:=(inp->'action'->>'recipient_user_id')::uuid;perform 1 from public.workspace_members where workspace_id=w and user_id=recipient and status='active'and role in('owner','admin','member')for share;if not found then raise exception using errcode='22023',message='automation_invalid_recipient';end if;end if;
 if op='automation.create'then insert into public.internal_automations(workspace_id,name,trigger_id,account_kind,action_id,recipient_user_id,created_by_user_id)values(w,inp->>'name','customer.created',inp->'condition'->>'account_kind',inp->'action'->>'action_id',recipient,a)returning *into d;
 else select *into d from public.internal_automations where workspace_id=w and id=(inp->>'id')::uuid for update;if not found then raise exception using errcode='P0002',message='automation_not_found';end if;if d.version<>(inp->>'expected_version')::bigint then raise exception using errcode='40001',message='automation_conflict';end if;
  if op='automation.update'then if d.enabled then raise exception using errcode='22023',message='automation_disable_before_edit';end if;update public.internal_automations set name=inp->>'name',account_kind=inp->'condition'->>'account_kind',action_id=inp->'action'->>'action_id',recipient_user_id=recipient,updated_at=statement_timestamp()where id=d.id returning *into d;
  elsif op='automation.enable'then if d.enabled then raise exception using errcode='22023',message='automation_invalid_transition';end if;update public.internal_automations set enabled=true,enabled_at=statement_timestamp(),updated_at=statement_timestamp()where id=d.id returning *into d;
  elsif op='automation.disable'then if not d.enabled then raise exception using errcode='22023',message='automation_invalid_transition';end if;update public.internal_automations set enabled=false,enabled_at=null,updated_at=statement_timestamp()where id=d.id returning *into d;
  else raise exception using errcode='22023',message='automation_invalid_input';end if;
 end if;
 prior:=jsonb_build_object('contract_version','automations.v1','operation',op,'command_id',inp->>'command_id','id',d.id,'version',d.version,'enabled',d.enabled);
 insert into public.product_audit_events(workspace_id,actor_id,command_id,operation,entity_id,entity_version)values(w,a,(inp->>'command_id')::uuid,op,d.id,d.version);update public.product_commands set receipt=prior where workspace_id=w and actor_id=a and command_id=(inp->>'command_id')::uuid;return prior;end$$;
create function public.automation_v1_process_pending(p_workspace_id uuid,p_input jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;d public.internal_automations%rowtype;e public.internal_automation_events%rowtype;prior jsonb;receipt jsonb;effect uuid;failure text;state text;processed int:=0;succeeded int:=0;failed int:=0;skipped int:=0;has_more boolean;child uuid;begin
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
     else raise exception using errcode='22023',message='automation_unregistered_action';end if;state:='succeeded';
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
create function public.automation_v1_read(w uuid,op text,inp jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare a uuid;d public.internal_automations%rowtype;items jsonb;lim int;next_id uuid;begin
 a:=public.team_v1_assert_scope(w);perform public.automation_v1_validate(op,inp);lim:=coalesce((inp->>'limit')::int,20);
 if op in('automation.get','automation.run_history')then select *into d from public.internal_automations where workspace_id=w and id=(inp->>'id')::uuid for share;if not found then return null;end if;end if;
 if op='automation.get'then return jsonb_build_object('contract_version','automations.v1','operation',op,'record',public.automation_v1_metadata(d));
 elsif op='automation.list'then select coalesce(jsonb_agg(public.automation_v1_metadata(q)order by q.id),'[]'::jsonb)into items from(select x.*from public.internal_automations x where x.workspace_id=w and(not inp?'after_id'or x.id>(inp->>'after_id')::uuid)order by x.id limit lim)q;
 elsif op='automation.run_history'then select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'automation_id',q.automation_id,'event_id',q.event_id,'action_id',q.action_id,'definition_version',q.definition_version,'status',q.status,'effect_id',q.effect_id,'failure_code',q.failure_code,'created_at',q.created_at)order by q.id),'[]'::jsonb)into items from(select x.*from public.internal_automation_runs x where x.workspace_id=w and x.automation_id=d.id and(not inp?'after_id'or x.id>(inp->>'after_id')::uuid)order by x.id limit lim)q;
 else raise exception using errcode='22023',message='automation_invalid_input';end if;
 if jsonb_array_length(items)=lim then next_id:=(items->(lim-1)->>'id')::uuid;end if;return jsonb_build_object('contract_version','automations.v1','operation',op,'items',items,'next_id',next_id);end$$;
create function public.automation_v1_create(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_command(p_workspace_id,'automation.create',p_input)$$;
create function public.automation_v1_update(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_command(p_workspace_id,'automation.update',p_input)$$;
create function public.automation_v1_enable(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_command(p_workspace_id,'automation.enable',p_input)$$;
create function public.automation_v1_disable(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_command(p_workspace_id,'automation.disable',p_input)$$;
create function public.automation_v1_list(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_read(p_workspace_id,'automation.list',p_input)$$;
create function public.automation_v1_get(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_read(p_workspace_id,'automation.get',p_input)$$;
create function public.automation_v1_run_history(p_workspace_id uuid,p_input jsonb)returns jsonb language sql security definer set search_path=''as $$select public.automation_v1_read(p_workspace_id,'automation.run_history',p_input)$$;
revoke all on function public.automation_v1_capture_customer(),public.automation_v1_validate(text,jsonb),public.automation_v1_metadata(public.internal_automations),public.automation_v1_command(uuid,text,jsonb),public.automation_v1_read(uuid,text,jsonb)from public,anon,authenticated,service_role;
revoke all on function public.automation_v1_create(uuid,jsonb),public.automation_v1_update(uuid,jsonb),public.automation_v1_enable(uuid,jsonb),public.automation_v1_disable(uuid,jsonb),public.automation_v1_process_pending(uuid,jsonb),public.automation_v1_list(uuid,jsonb),public.automation_v1_get(uuid,jsonb),public.automation_v1_run_history(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.automation_v1_create(uuid,jsonb),public.automation_v1_update(uuid,jsonb),public.automation_v1_enable(uuid,jsonb),public.automation_v1_disable(uuid,jsonb),public.automation_v1_process_pending(uuid,jsonb),public.automation_v1_list(uuid,jsonb),public.automation_v1_get(uuid,jsonb),public.automation_v1_run_history(uuid,jsonb)to authenticated;
commit;
