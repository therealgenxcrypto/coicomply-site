-- Run this in Supabase SQL Editor.
-- Purpose: track uploads per authenticated customer and enforce per-user access with RLS.

create table if not exists public.document_uploads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  uploadcare_cdn_url text not null,
  uploadcare_uuid text,
  filename text,
  mime_type text,
  size_bytes bigint,
  source text not null default 'unknown',
  status text not null default 'received',
  created_at timestamptz not null default now()
);

alter table public.document_uploads
  add column if not exists uploadcare_uuid text,
  add column if not exists mime_type text,
  add column if not exists status text not null default 'received';

alter table public.document_uploads enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.document_uploads to authenticated;
grant usage, select on sequence public.document_uploads_id_seq to authenticated;

drop policy if exists "Users can view their own uploads" on public.document_uploads;
create policy "Users can view their own uploads"
on public.document_uploads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own uploads" on public.document_uploads;
create policy "Users can insert their own uploads"
on public.document_uploads
for insert
to authenticated
with check (auth.uid() = user_id);

create schema if not exists private;

create or replace function private.enforce_document_upload_trial_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload_count integer;
begin
  if new.user_id is null or new.user_id <> auth.uid() then
    raise exception 'Uploads must be associated with the authenticated user.';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text)::bigint);

  select count(*)
    into upload_count
    from public.document_uploads
    where user_id = new.user_id;

  if upload_count >= 10 then
    raise exception 'Free trial upload limit reached.';
  end if;

  return new;
end;
$$;

drop trigger if exists document_upload_trial_limit on public.document_uploads;
create trigger document_upload_trial_limit
before insert on public.document_uploads
for each row
execute function private.enforce_document_upload_trial_limit();
