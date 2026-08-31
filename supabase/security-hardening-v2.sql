-- COIComply security-hardening design.
-- Review in a Supabase development branch before applying to production.
-- Do not run against production until the project is active, backed up, and the application code is ready.

begin;

create table if not exists public.customer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  membership_status text not null default 'pending'
    check (membership_status in ('pending', 'active', 'suspended', 'cancelled')),
  upload_enabled boolean not null default false,
  vendor_limit integer not null default 50 check (vendor_limit > 0),
  founding_price_locked boolean not null default false,
  initial_term_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_accounts enable row level security;
alter table public.customer_accounts force row level security;

revoke all on public.customer_accounts from anon;
revoke all on public.customer_accounts from authenticated;
grant usage on schema public to authenticated;
grant select on public.customer_accounts to authenticated;

drop policy if exists "Customers can view their own account" on public.customer_accounts;
create policy "Customers can view their own account"
on public.customer_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

alter table public.document_uploads
  alter column uploadcare_cdn_url drop not null;

alter table public.document_uploads
  add column if not exists sha256 text,
  add column if not exists retention_delete_after timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

comment on column public.document_uploads.uploadcare_cdn_url is
  'Deprecated. Do not populate after private signed delivery is enabled.';

create index if not exists document_uploads_user_id_idx
  on public.document_uploads (user_id);

create unique index if not exists document_uploads_uploadcare_uuid_uidx
  on public.document_uploads (uploadcare_uuid)
  where uploadcare_uuid is not null;

alter table public.document_uploads enable row level security;
alter table public.document_uploads force row level security;

revoke all on public.document_uploads from anon;
revoke all on public.document_uploads from authenticated;
grant select, insert on public.document_uploads to authenticated;
grant usage, select on sequence public.document_uploads_id_seq to authenticated;

drop policy if exists "Users can view their own uploads" on public.document_uploads;
create policy "Users can view their own uploads"
on public.document_uploads
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and deleted_at is null
);

drop policy if exists "Users can insert their own uploads" on public.document_uploads;
create policy "Active customers can register their own uploads"
on public.document_uploads
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and uploadcare_uuid is not null
  and uploadcare_cdn_url is null
  and status in ('authorized', 'received', 'scanning')
  and exists (
    select 1
    from public.customer_accounts account
    where account.user_id = (select auth.uid())
      and account.membership_status = 'active'
      and account.upload_enabled = true
  )
);

drop trigger if exists document_upload_trial_limit on public.document_uploads;
drop function if exists private.enforce_document_upload_trial_limit();

create table if not exists private.document_access_events (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.document_uploads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('upload_authorized', 'uploaded', 'scan_passed', 'quarantined', 'viewed', 'downloaded', 'deletion_requested', 'deleted')),
  occurred_at timestamptz not null default now(),
  request_id text
);

revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

commit;

-- Verification required after applying in development:
-- 1. Anonymous SELECT and INSERT fail.
-- 2. Customer A cannot select Customer B records.
-- 3. A pending customer cannot insert upload metadata.
-- 4. An active customer cannot insert a public CDN URL.
-- 5. Security Advisor returns no unresolved critical findings.
