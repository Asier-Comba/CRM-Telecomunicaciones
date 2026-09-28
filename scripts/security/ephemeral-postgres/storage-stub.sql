-- Test-only metadata stub; actual Supabase Storage/Auth/PostgREST are separate gates.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key,
  bucket_id text not null references storage.buckets(id),
  name text not null,
  unique (bucket_id,name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;
grant select on storage.objects to authenticated,anon;
