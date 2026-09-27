-- Secure acceptance expectations. Execute only through the disposable W4 runner.
begin;
do $$begin if current_setting('app.environment',true) is distinct from 'test' then raise exception 'test fixture only'; end if; end$$;
insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000001','synthetic@example.invalid');
insert into public.workspaces(id,name,slug,status) values('20000000-0000-0000-0000-000000000001','Synthetic','synthetic','active');
do $$
declare c record; accepted boolean; failures text[] := array[]::text[];
begin
 for c in select * from (values
   ('valid_initial','status',quote_literal('uploaded'),true),
   ('terminal_status_only','status',quote_literal('completed'),false),
   ('nonzero_counters','total_rows','1',false),
   ('completed_at_only','completed_at','now()',false),
   ('applied_without_staging','total_rows,valid_rows,applied_rows,checkpoint_rows_processed','1,1,1,1',false),
   ('fabricated_finalization','status,total_rows,valid_rows,applied_rows,checkpoint_rows_processed,completed_at',quote_literal('completed')||',99,99,99,99,now()',false)
 ) as cases(label,columns_sql,values_sql,should_accept)
 loop
  accepted:=true;
  begin
   execute 'insert into public.import_jobs(workspace_id,import_kind,source_file_ref_id,source_file_digest_hmac,digest_key_version,mapping_schema_version,idempotency_key_id,created_by_user_id,'||c.columns_sql||') values(''20000000-0000-0000-0000-000000000001'',''customers'',gen_random_uuid(),repeat(''a'',64),1,1,gen_random_uuid(),''10000000-0000-0000-0000-000000000001'','||c.values_sql||')';
  exception when check_violation or raise_exception then accepted:=false;
  end;
  if accepted is distinct from c.should_accept then failures:=array_append(failures,c.label); end if;
 end loop;
 if cardinality(failures)>0 then raise exception 'W4 initial import acceptance failed: %',array_to_string(failures,','); end if;
end$$;
rollback;
