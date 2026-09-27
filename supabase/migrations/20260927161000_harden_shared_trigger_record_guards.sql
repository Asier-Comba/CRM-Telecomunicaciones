-- Forward-only repair for trigger functions attached to heterogeneous records.
-- PL/pgSQL must choose the table/operation branch before reading fields that do
-- not exist on every trigger record shape.

begin;

create or replace function public.validate_telecom_plan_operator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    raise exception using errcode = '0A000', message = 'unsupported telecom plan trigger operation';
  end if;

  case tg_table_name
    when 'telecom_contracts' then
      if new.plan_version_id is not null and not exists (
        select 1
          from public.telecom_plan_versions pv
          join public.telecom_plans p
            on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
         where pv.id = new.plan_version_id
           and pv.workspace_id = new.workspace_id
           and p.operator_id = new.operator_id
           and pv.valid_from <= new.start_date
           and (pv.valid_until is null or pv.valid_until >= new.start_date)
      ) then
        raise exception using errcode = '23514', message = 'plan version is invalid for contract';
      end if;
    when 'telecom_services' then
      if new.plan_version_id is not null and not exists (
        select 1
          from public.telecom_plan_versions pv
          join public.telecom_plans p
            on p.id = pv.plan_id and p.workspace_id = pv.workspace_id
         where pv.id = new.plan_version_id
           and pv.workspace_id = new.workspace_id
           and p.operator_id = new.operator_id
           and p.service_kind = new.service_kind
           and (
             new.activated_on is null
             or (
               pv.valid_from <= new.activated_on
               and (pv.valid_until is null or pv.valid_until >= new.activated_on)
             )
           )
      ) then
        raise exception using errcode = '23514', message = 'plan version is invalid for service';
      end if;
    else
      raise exception using errcode = '0A000', message = 'unsupported telecom plan trigger table';
  end case;

  return new;
end;
$$;

create or replace function public.protect_support_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' then
    raise exception using errcode = '0A000', message = 'unsupported support identity trigger operation';
  end if;

  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception using errcode = '55000', message = 'entity, workspace and creator are immutable';
  end if;

  case tg_table_name
    when 'service_cases' then
      if new.customer_id is distinct from old.customer_id then
        raise exception using errcode = '55000', message = 'case customer is immutable';
      end if;
    when 'documents' then
      if new.storage_bucket is distinct from old.storage_bucket
        or new.storage_path is distinct from old.storage_path
        or new.sha256_hex is distinct from old.sha256_hex
        or new.size_bytes is distinct from old.size_bytes
        or new.media_type is distinct from old.media_type then
        raise exception using errcode = '55000', message = 'document storage identity is immutable';
      end if;
      if new.customer_id is distinct from old.customer_id
        or new.contract_id is distinct from old.contract_id
        or new.service_id is distinct from old.service_id
        or new.line_id is distinct from old.line_id
        or new.service_case_id is distinct from old.service_case_id
        or new.opportunity_id is distinct from old.opportunity_id then
        raise exception using errcode = '55000', message = 'document target is immutable';
      end if;
    else
      raise exception using errcode = '0A000', message = 'unsupported support identity trigger table';
  end case;

  return new;
end;
$$;

create or replace function public.protect_import_child_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' then
    raise exception using errcode = '0A000', message = 'unsupported import child trigger operation';
  end if;

  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.import_job_id is distinct from old.import_job_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '55000', message = 'import child identity is immutable';
  end if;

  case tg_table_name
    when 'import_field_mappings' then
      if new.created_by_user_id is distinct from old.created_by_user_id then
        raise exception using errcode = '55000', message = 'mapping creator is immutable';
      end if;
    when 'import_staging_rows' then
      if new.source_row_number is distinct from old.source_row_number
        or new.row_digest_hmac is distinct from old.row_digest_hmac
        or new.encrypted_payload_ref_id is distinct from old.encrypted_payload_ref_id then
        raise exception using errcode = '55000', message = 'staging row binding is immutable';
      end if;
    else
      raise exception using errcode = '0A000', message = 'unsupported import child trigger table';
  end case;

  return new;
end;
$$;

revoke all on function public.validate_telecom_plan_operator() from public, anon, authenticated;
revoke all on function public.protect_support_identity() from public, anon, authenticated;
revoke all on function public.protect_import_child_identity() from public, anon, authenticated;

commit;
