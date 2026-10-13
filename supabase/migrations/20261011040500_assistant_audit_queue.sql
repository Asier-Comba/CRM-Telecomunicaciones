-- Private bounded discovery for the separately fenced audit protocol.
begin;
create index assistant_original_audit_worker_queue_idx on public.assistant_original_audit_intents(workspace_id,capability,created_at,event_ref);
create index assistant_audit_pending_queue_idx on public.assistant_audit_delivery_outbox(workspace_id,next_eligible_at,event_ref) where state='pending';
create function public.assistant_durable_v1_list_audit(
 p_workspace uuid,p_worker text,p_authority_version bigint,p_after_time text,p_after_event text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;g public.assistant_registered_audit_workers%rowtype;t timestamptz;after_time timestamptz;items jsonb;cursor_value jsonb;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_worker is null or p_worker !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_authority_version is null or p_authority_version<1 or p_authority_version>=9007199254740991
 or p_after_time is null or p_after_event is null then
  raise exception using errcode='22023',message='assistant_invalid_request';end if;
 if p_after_time='' and p_after_event='' then after_time:=null;
 elsif length(p_after_time)<=40 and p_after_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
 and p_after_event ~ '^[0-9a-f]{64}$' then after_time:=p_after_time::timestamptz;
 else raise exception using errcode='22023',message='assistant_invalid_request';end if;
 select * into g from public.assistant_registered_audit_workers x
 where x.workspace_id=p_workspace and x.worker_ref=p_worker and x.actor_id=a for share;
 if not found then return jsonb_build_object('status','forbidden');end if;
 t:=clock_timestamp();
 if not g.active or g.authority_version<>p_authority_version or t>=g.expires_at then return jsonb_build_object('status','forbidden');end if;
 select coalesce(jsonb_agg(jsonb_build_object('eventRef',q.event_ref,'version',q.version,'createdAt',q.created_at)
  order by q.created_at,q.event_ref),'[]'::jsonb) into items from (
  select i.event_ref,i.created_at,d.version from public.assistant_original_audit_intents i
  join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
  where i.workspace_id=p_workspace and i.capability=g.capability and d.state='pending' and d.next_eligible_at<=t
  and (d.worker_ref is null or d.lease_expires_at is null or d.lease_expires_at<=t)
  and (after_time is null or (i.created_at,i.event_ref)>(after_time,p_after_event))
  order by i.created_at,i.event_ref limit 20
 ) q;
 -- A long catalog query cannot release metadata after the locked grant expires.
 if clock_timestamp()>=g.expires_at then return jsonb_build_object('status','forbidden');end if;
 cursor_value:=case when jsonb_array_length(items)=20 then
  jsonb_build_object('createdAt',items->19->>'createdAt','eventRef',items->19->>'eventRef') else 'null'::jsonb end;
 return jsonb_build_object('status','applied','items',items,'nextCursor',cursor_value);
end$$;
revoke all on function public.assistant_durable_v1_list_audit(uuid,text,bigint,text,text) from public,anon,authenticated,service_role;
commit;
