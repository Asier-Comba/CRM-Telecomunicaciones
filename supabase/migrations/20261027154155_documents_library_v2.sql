-- D1 owner-delegated metadata library. Separate from Storage 88/#179.
-- No raw filename, storage path, content capability or folder authority.
begin;
create schema documents_library_private;
revoke all on schema documents_library_private from public,anon,authenticated,service_role;
create table documents_library_private.settings(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 key_bytes bytea not null default extensions.gen_random_bytes(32) check(octet_length(key_bytes)=32),
 key_generation bigint not null default 1 check(key_generation>0)
);
alter table documents_library_private.settings enable row level security;
alter table documents_library_private.settings force row level security;
revoke all on documents_library_private.settings from public,anon,authenticated,service_role;
insert into documents_library_private.settings(singleton)values(true);
-- A privileged future rotation replaces key_bytes and increments generation,
-- invalidating every old cursor. No public rotation/key-export function exists.
-- Index maintenance runs with the legitimate writer's privileges. Use only
-- built-ins here and the identical expressions in the guarded reader below;
-- a private formatter would require new EXECUTE grants on legacy mutations.
create index documents_library_workspace_status_created_id_idx on public.documents(workspace_id,status,created_at,id);
create index documents_library_title_search_idx on public.documents using gin(to_tsvector('simple'::regconfig,(case document_kind when 'general'then 'General'when 'identity'then 'Identidad'when 'contract'then 'Contrato'when 'service'then 'Servicio'when 'incident'then 'Incidencia'when 'billing'then 'Facturación'else 'Otro'end||' · ref '||left(id::text,8))||' '||document_kind));
create index documents_library_customer_label_search_idx on public.customers using gin(to_tsvector('simple'::regconfig,case when id is null then null else coalesce(nullif(btrim(regexp_replace(coalesce(nullif(btrim(trade_name),''),legal_name),'[[:cntrl:]]',' ','g')),''),'Empresa · ref '||left(id::text,8))end));

create function documents_library_private.list(p_workspace_id uuid,p_input jsonb)returns jsonb
language plpgsql security definer set search_path=''as $$
declare actor uuid;wm public.workspace_members%rowtype;w public.workspaces%rowtype;membership_tx text;workspace_tx text;
 enabled boolean;secret bytea;generation bigint;revision jsonb;normalized jsonb;filter_hash text;
 lim integer;sort_order text;state text;q text;kind_filter text;format_filter text;customer_filter uuid;target_kind text;target_id uuid;
 from_at timestamptz;before_at timestamptz;cutoff timestamptz:=statement_timestamp();expires timestamptz:=statement_timestamp()+interval '10 minutes';
 token jsonb;after_at timestamptz;after_id uuid;token_text text;selected jsonb;answer jsonb;last_item jsonb;next_cursor text;
begin
 -- Canonical guard takes shared workspace/membership locks until transaction end.
 actor:=public.document_v1_assert_scope(p_workspace_id);
 select *into strict wm from public.workspace_members where workspace_id=p_workspace_id and user_id=actor;
 select *into strict w from public.workspaces where id=p_workspace_id;
 select m.xmin::text into membership_tx from public.workspace_members m where m.id=wm.id;
 select s.xmin::text into workspace_tx from public.workspaces s where s.id=p_workspace_id;
 select s.enabled,s.key_bytes,s.key_generation into enabled,secret,generation from documents_library_private.settings s where singleton for share;
 if enabled is distinct from true then raise exception using errcode='PT503',message='document_library_unavailable';end if;
 revision:=jsonb_build_array(wm.id,extract(epoch from wm.updated_at)::text,wm.role,membership_tx,extract(epoch from w.updated_at)::text,workspace_tx,generation);
 if p_input is null or jsonb_typeof(p_input)<>'object'or octet_length(p_input::text)>8192
 or exists(select 1 from jsonb_object_keys(p_input)k where k not in('status','query','customer_id','target','document_kind','format','created_from','created_before','sort','limit','cursor'))
 or exists(select 1 from jsonb_each(p_input)e where e.value='null'::jsonb)then raise exception using errcode='22023',message='document_library_invalid_input';end if;
 if p_input?'status'and(jsonb_typeof(p_input->'status')<>'string'or p_input->>'status'not in('active','archived'))
 or p_input?'sort'and(jsonb_typeof(p_input->'sort')<>'string'or p_input->>'sort'not in('created_asc','created_desc'))
 or p_input?'limit'and(jsonb_typeof(p_input->'limit')<>'number'or p_input->>'limit'!~'^[1-9][0-9]{0,2}$'or(p_input->>'limit')::integer>100)
 or p_input?'query'and(jsonb_typeof(p_input->'query')<>'string'or char_length(btrim(p_input->>'query'))not between 2 and 100 or p_input->>'query'~'[[:cntrl:]]')
 or p_input?'customer_id'and(jsonb_typeof(p_input->'customer_id')<>'string'or p_input->>'customer_id'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 or p_input?'document_kind'and(jsonb_typeof(p_input->'document_kind')<>'string'or p_input->>'document_kind'not in('general','identity','contract','service','incident','billing','other'))
 or p_input?'format'and(jsonb_typeof(p_input->'format')<>'string'or p_input->>'format'not in('pdf','image'))
 then raise exception using errcode='22023',message='document_library_invalid_input';end if;
 if p_input?'target'and(jsonb_typeof(p_input->'target')<>'object'or(select array_agg(k order by k)from jsonb_object_keys(p_input->'target')k)is distinct from array['id','kind']::text[]
 or jsonb_typeof(p_input#>'{target,kind}')<>'string'or p_input#>>'{target,kind}'not in('customer','contract','service','line','service_case','opportunity')
 or jsonb_typeof(p_input#>'{target,id}')<>'string'or p_input#>>'{target,id}'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')then raise exception using errcode='22023',message='document_library_invalid_input';end if;
 if exists(select 1 from unnest(array['created_from','created_before'])k where p_input?k and(jsonb_typeof(p_input->k)<>'string'or p_input->>k!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'))then raise exception using errcode='22023',message='document_library_invalid_input';end if;
 state:=coalesce(p_input->>'status','active');sort_order:=coalesce(p_input->>'sort','created_desc');lim:=coalesce((p_input->>'limit')::integer,20);
 q:=nullif(btrim(p_input->>'query'),'');kind_filter:=p_input->>'document_kind';format_filter:=p_input->>'format';customer_filter:=(p_input->>'customer_id')::uuid;
 target_kind:=p_input#>>'{target,kind}';target_id:=(p_input#>>'{target,id}')::uuid;from_at:=(p_input->>'created_from')::timestamptz;before_at:=(p_input->>'created_before')::timestamptz;
 if from_at is not null and before_at is not null and from_at>=before_at then raise exception using errcode='22023',message='document_library_invalid_input';end if;
 normalized:=jsonb_build_object('status',state,'sort',sort_order,'limit',lim,'query',q,'document_kind',kind_filter,'format',format_filter,'customer_id',customer_filter,'target_kind',target_kind,'target_id',target_id,'created_from',from_at,'created_before',before_at);
 filter_hash:=encode(extensions.digest(normalized::text,'sha256'),'hex');
 if p_input?'cursor'then
  token_text:=p_input->>'cursor';
  if jsonb_typeof(p_input->'cursor')<>'string'or char_length(token_text)not between 32 and 4096 or token_text!~'^[A-Za-z0-9_-]+$'then raise exception using errcode='22023',message='document_library_invalid_cursor';end if;
  begin
   token:=extensions.pgp_sym_decrypt(decode(translate(token_text,'-_','+/')||repeat('=',(4-char_length(token_text)%4)%4),'base64'),encode(secret,'hex'))::jsonb;
   if jsonb_typeof(token)<>'object'or(select array_agg(k order by k)from jsonb_object_keys(token)k)is distinct from array['actor','after_created_at','after_id','contract','expires_at','filters','revision','snapshot_at','workspace']::text[]
   or exists(select 1 from jsonb_each(token)e where e.value='null'::jsonb)
   or token->>'contract'is distinct from 'document.library.cursor.v2'or token->>'actor'is distinct from actor::text or token->>'workspace'is distinct from p_workspace_id::text or token->'revision'is distinct from revision or token->>'filters'is distinct from filter_hash
   or(token->>'expires_at')::timestamptz<=statement_timestamp()or(token->>'snapshot_at')::timestamptz>statement_timestamp()then raise exception 'invalid';end if;
   after_at:=(token->>'after_created_at')::timestamptz;after_id:=(token->>'after_id')::uuid;cutoff:=(token->>'snapshot_at')::timestamptz;expires:=(token->>'expires_at')::timestamptz;
   if after_at is null or after_id is null or after_at>cutoff or expires>cutoff+interval '10 minutes'then raise exception 'invalid';end if;
  exception when others then raise exception using errcode='22023',message='document_library_invalid_cursor';end;
 end if;
 -- All canonical relations are joined within the current authorized workspace.
 -- This preserves document.v1's owner/admin metadata scope, including archived
 -- targets. Current labels/status/relations are re-read, never a frozen snapshot.
 with authorized as(
  select d.id,d.version,d.status,d.document_kind,d.media_type,d.size_bytes,d.created_at,
   case d.document_kind when 'general'then 'General'when 'identity'then 'Identidad'when 'contract'then 'Contrato'when 'service'then 'Servicio'when 'incident'then 'Incidencia'when 'billing'then 'Facturación'else 'Otro'end||' · ref '||left(d.id::text,8)display_title,
   case when d.customer_id is not null then 'customer'when d.contract_id is not null then 'contract'when d.service_id is not null then 'service'when d.line_id is not null then 'line'when d.service_case_id is not null then 'service_case'else 'opportunity'end entity_kind,
   coalesce(d.customer_id,co.id,sv.id,ln.id,cs.id,op.id)entity_id,
   cu.id customer_id,case when cu.id is null then null else coalesce(nullif(btrim(regexp_replace(coalesce(nullif(btrim(cu.trade_name),''),cu.legal_name),'[[:cntrl:]]',' ','g')),''),'Empresa · ref '||left(cu.id::text,8))end customer_label
  from public.documents d
  left join public.telecom_contracts co on co.workspace_id=d.workspace_id and co.id=d.contract_id
  left join public.telecom_services sv on sv.workspace_id=d.workspace_id and sv.id=d.service_id
  left join public.telecom_lines ln on ln.workspace_id=d.workspace_id and ln.id=d.line_id
  left join public.telecom_services ls on ls.workspace_id=d.workspace_id and ls.id=ln.service_id
  left join public.service_cases cs on cs.workspace_id=d.workspace_id and cs.id=d.service_case_id
  left join public.opportunities op on op.workspace_id=d.workspace_id and op.id=d.opportunity_id
  left join public.customers cu on cu.workspace_id=d.workspace_id and cu.id=coalesce(d.customer_id,co.customer_id,sv.customer_id,ls.customer_id,cs.customer_id,op.customer_id)
  where d.workspace_id=p_workspace_id and d.status=state and d.created_at<=cutoff
   and coalesce(d.customer_id,co.id,sv.id,ln.id,cs.id,op.id)is not null
 ),filtered as materialized(
  select a.*,case a.entity_kind when 'customer'then 'Empresa'when 'contract'then 'Contrato'when 'service'then 'Servicio'when 'line'then 'Línea'when 'service_case'then 'Incidencia'else 'Oportunidad'end||' · ref '||left(a.entity_id::text,8)target_label
  from authorized a where(customer_filter is null or a.customer_id=customer_filter)
   and(target_kind is null or a.entity_kind=target_kind and a.entity_id=target_id)
   and(kind_filter is null or a.document_kind=kind_filter)
   and(format_filter is null or format_filter='pdf'and a.media_type='application/pdf'or format_filter='image'and a.media_type in('image/png','image/jpeg'))
   and(from_at is null or a.created_at>=from_at)and(before_at is null or a.created_at<before_at)
   and(q is null or to_tsvector('simple'::regconfig,a.display_title||' '||a.document_kind)@@plainto_tsquery('simple'::regconfig,q)
    or to_tsvector('simple'::regconfig,coalesce(a.customer_label,''))@@plainto_tsquery('simple'::regconfig,q)
    or to_tsvector('simple'::regconfig,a.entity_kind||' '||left(a.entity_id::text,8))@@plainto_tsquery('simple'::regconfig,q))
 ),page as(
  select *from filtered f where after_at is null or(sort_order='created_asc'and(f.created_at,f.id)>(after_at,after_id))or(sort_order='created_desc'and(f.created_at,f.id)<(after_at,after_id))
  order by case when sort_order='created_asc'then created_at end asc,case when sort_order='created_desc'then created_at end desc,case when sort_order='created_asc'then id end asc,case when sort_order='created_desc'then id end desc limit lim+1
 )select jsonb_build_object('total_count',(select count(*)from filtered),'rows',coalesce((select jsonb_agg(to_jsonb(p)order by case when sort_order='created_asc'then p.created_at end asc,case when sort_order='created_desc'then p.created_at end desc,case when sort_order='created_asc'then p.id end asc,case when sort_order='created_desc'then p.id end desc)from page p),'[]'::jsonb))into selected;
 if jsonb_array_length(selected->'rows')>lim then
  last_item:=selected->'rows'->(lim-1);
  token:=jsonb_build_object('contract','document.library.cursor.v2','actor',actor,'workspace',p_workspace_id,'revision',revision,'filters',filter_hash,'after_created_at',last_item->>'created_at','after_id',last_item->>'id','snapshot_at',cutoff,'expires_at',expires);
  next_cursor:=rtrim(translate(replace(encode(extensions.pgp_sym_encrypt(token::text,encode(secret,'hex'),'cipher-algo=aes256,compress-algo=0'),'base64'),E'\n',''),'+/','-_'),'=');
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x->'id','version',x->'version','status',x->'status','document_kind',x->'document_kind','display_title',x->'display_title','title_state','available','media_type',x->'media_type','size_bytes',x->'size_bytes',
  'created_at',to_char((x->>'created_at')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'context',jsonb_build_object('target',jsonb_build_object('kind',x->'entity_kind','id',x->'entity_id','label',x->'target_label'),'customer',case when x->>'customer_id'is null then null else jsonb_build_object('id',x->'customer_id','label',x->'customer_label')end))order by n),'[]'::jsonb)into answer from jsonb_array_elements(selected->'rows')with ordinality e(x,n)where n<=lim;
 return jsonb_build_object('contract_version','document.library.v2','operation','document.library_list','items',answer,'next_cursor',next_cursor,'completeness','complete','total_count',selected->'total_count','count_state','exact',
  'capabilities',jsonb_build_object('search_fields',jsonb_build_array('title','reference','customer_label','category'),'sort_fields',jsonb_build_array('created_asc','created_desc'),'private_content',false,'folders',false,'file_name',false,'consistency','live_reauthorized_creation_cutoff'));
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then raise exception using errcode='22023',message='document_library_invalid_input';
end;
$$;
revoke all on function documents_library_private.list(uuid,jsonb)from public,anon,authenticated,service_role;
-- Invoker wrapper exposes only the guarded read; private data/key have no grants.
grant usage on schema documents_library_private to authenticated;
grant execute on function documents_library_private.list(uuid,jsonb)to authenticated;
create function public.document_library_v2_list(p_workspace_id uuid,p_input jsonb)returns jsonb
language sql security invoker set search_path=''as $$select documents_library_private.list(p_workspace_id,p_input)$$;
revoke all on function public.document_library_v2_list(uuid,jsonb)from public,anon,authenticated,service_role;
grant execute on function public.document_library_v2_list(uuid,jsonb)to authenticated;
commit;
