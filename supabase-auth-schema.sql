-- Run this in Supabase SQL Editor.
-- Purpose: track uploads per authenticated customer and enforce per-user access with RLS.

create table if not exists public.document_uploads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  uploadcare_cdn_url text not null,
  filename text,
  size_bytes bigint,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

alter table public.document_uploads enable row level security;

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
