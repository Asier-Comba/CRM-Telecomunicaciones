-- Confirmation cancellation only; no effect execution or client grants.
begin;
create function public.assistant_durable_v1_cancel(
 p_workspace uuid,p_confirmation text,p_capability text,p_digest text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;t timestamptz;c public.assistant_confirmations%rowtype;
begin
 a:=public.product_v1_assert_scope(p_workspace,true);
 if p_confirmation is null or p_confirmation !~ '^[A-Za-z0-9_-]{24,200}$'
 or p_capability is null or p_capability !~ '^[a-z][a-z0-9.:_-]{2,119}$'
 or p_digest is null or p_digest !~ '^[0-9a-f]{64}$' then
  raise exception using errcode='22023',message='assistant_invalid_binding';end if;
 select * into c from public.assistant_confirmations x
 where x.workspace_id=p_workspace and x.confirmation_ref=p_confirmation for update;
 t:=clock_timestamp();
 if not found then return jsonb_build_object('status','not_found');end if;
 if c.actor_id<>a or c.capability<>p_capability or c.arguments_digest<>p_digest then
  return jsonb_build_object('status','binding_mismatch');end if;
 if c.state<>'issued' then return jsonb_build_object('status','already_terminal');end if;
 if c.version>=9007199254740991 then
  raise exception using errcode='22023',message='assistant_version_exhausted';end if;
 update public.assistant_confirmations set state=case when t>=expires_at then 'expired' else 'cancelled' end,
  version=version+1,updated_at=t where workspace_id=p_workspace and confirmation_ref=p_confirmation returning * into c;
 if c.state='expired' then return jsonb_build_object('status','expired');end if;
 return jsonb_build_object('status','applied','record',jsonb_build_object('operationRef',c.confirmation_ref,
  'binding',jsonb_build_object('actorId',c.actor_id,'workspaceId',c.workspace_id,'capability',c.capability,'argumentsDigest',c.arguments_digest),
  'state',c.state,'version',c.version,'issuedAt',c.issued_at,'expiresAt',c.expires_at,'updatedAt',c.updated_at));
end;
$$;
revoke all on function public.assistant_durable_v1_cancel(uuid,text,text,text) from public,anon,authenticated,service_role;
commit;
