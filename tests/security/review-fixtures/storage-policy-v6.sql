-- Inject into the telecom domain fixture before its final rollback.
reset role;
insert into storage.objects(id,bucket_id,name)
select id,'telecom-documents',storage_path from public.documents
where id in ('76000000-0000-0000-0000-000000000001','76000000-0000-0000-0000-000000000002','76000000-0000-0000-0000-000000000003');
insert into storage.objects(id,bucket_id,name) values
 ('79000000-0000-4000-8000-000000000001','telecom-import-quarantine','synthetic.zip'),
 ('79000000-0000-4000-8000-000000000002','telecom-documents','orphan-synthetic.pdf');
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$begin
 if (select count(*) from storage.objects) <> 1 then raise exception 'owner object scope failed'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000007',false);
do $$begin
 if (select count(*) from storage.objects) <> 1 then raise exception 'admin object scope failed'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
do $$begin
 if (select count(*) from storage.objects) <> 0 then raise exception 'ordinary member reads object'; end if;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
do $$begin
 if (select count(*) from storage.objects) <> 0 then raise exception 'suspended workspace reads object'; end if;
end$$;
reset role;
update public.documents set status='archived',archived_at=now() where id='76000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$begin
 if (select count(*) from storage.objects) <> 0 then raise exception 'archived metadata reads object'; end if;
end$$;
reset role;
set role anon;
select set_config('request.jwt.claim.sub','',false);
do $$begin
 if (select count(*) from storage.objects) <> 0 then raise exception 'anonymous object read'; end if;
end$$;
reset role;
