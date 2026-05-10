-- ============================================================
-- DEMO LEADS — name + email captured before someone enters /demo/.
-- Anonymous can INSERT. Only authenticated studio members can read.
-- This file is *not* part of the demo data refresh — it accumulates
-- leads over time. Safe to run multiple times.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.demo_leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  source     text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_leads_email_idx   on public.demo_leads(email);
create index if not exists demo_leads_created_idx on public.demo_leads(created_at desc);

alter table public.demo_leads enable row level security;

drop policy if exists demo_leads_anon_insert  on public.demo_leads;
drop policy if exists demo_leads_auth_select  on public.demo_leads;
drop policy if exists demo_leads_auth_delete  on public.demo_leads;

-- Anyone can submit a lead (the public /demo.html modal is anon)
create policy demo_leads_anon_insert on public.demo_leads
  for insert to anon, authenticated with check (true);

-- Only signed-in studio members can read leads (for follow-up)
create policy demo_leads_auth_select on public.demo_leads
  for select to authenticated using (true);

-- Owners can clean up duplicates / spam
create policy demo_leads_auth_delete on public.demo_leads
  for delete to authenticated using (true);
