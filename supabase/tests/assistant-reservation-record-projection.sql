-- Type-compatible records are required before composing the reservation port.
begin;
insert into public.assistant_registered_dispatchers values('fixture.projection','fixture.projection',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$declare c jsonb;r jsonb;replay jsonb;ref text;
begin
 c:=public.assistant_durable_v1_issue('b2000000-0000-4000-8000-000000000001','fixture.projection',repeat('a',64));
 if c->'record' is null then raise exception 'confirmation_projection_missing';end if;
 ref:=c->>'confirmationRef';
 if c->'record'->>'operationRef'<>ref or c->'record'->>'state'<>'issued'
 or (c->'record'->>'version')::bigint<>1
 or c->'record'->'binding'<>jsonb_build_object('actorId','a1000000-0000-4000-8000-000000000001',
  'workspaceId','b2000000-0000-4000-8000-000000000001','capability','fixture.projection','argumentsDigest',repeat('a',64))
 or (select count(*) from jsonb_object_keys(c->'record'))<>7 then raise exception 'confirmation_projection_invalid';end if;
 r:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',ref,
  'fixture.projection',repeat('a',64),'projection_idempotency_key','fixture.projection',
  'projection_command_reference','projection_original_request');
 if r->'record' is null then raise exception 'operation_projection_missing';end if;
 if r->'record'->>'operationRef'<>r->>'operationRef' or r->'record'->>'idempotencyKey'<>'projection_idempotency_key'
 or r->'record'->'binding'<>c->'record'->'binding' or r->'record'->>'state'<>'reserved'
 or (r->'record'->>'version')::bigint<>1 or (r->'record'->>'attempt')::bigint<>1
 or (select count(*) from jsonb_object_keys(r->'record'))<>9 then raise exception 'operation_projection_invalid';end if;
 replay:=public.assistant_durable_v1_confirm_reserve('b2000000-0000-4000-8000-000000000001',ref,
  'fixture.projection',repeat('a',64),'projection_idempotency_key','fixture.projection',
  'projection_command_reference','projection_retry_request');
 if replay->>'status'<>'existing' or replay->'record'<>r->'record' then raise exception 'record_replay_changed';end if;
end$$;
rollback;
