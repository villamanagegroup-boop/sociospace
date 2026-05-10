-- ============================================================
-- SOCIO SPACE STUDIOS — Initial Supabase schema
-- Run this entire block in the Supabase SQL Editor.
-- Idempotent-ish (uses IF NOT EXISTS where possible) but designed for a fresh project.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- Tenancy
-- ============================================================

create table if not exists public.studios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'studio',
  owner_id    uuid not null references auth.users(id) on delete cascade,
  is_platform boolean not null default false,   -- true for Socio Space's own tenant
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.studio_members (
  studio_id  uuid not null references public.studios(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',     -- owner | manager | partnerships | readonly
  created_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);

create index if not exists studio_members_user_idx on public.studio_members(user_id);

-- Helper: am I a member of this studio?
create or replace function public.is_studio_member(p_studio uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.studio_members
    where studio_id = p_studio and user_id = auth.uid()
  );
$$;

-- When a studio is created, add the owner as a member automatically.
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.studio_members(studio_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists after_studio_created on public.studios;
create trigger after_studio_created
  after insert on public.studios
  for each row execute function public.add_owner_as_member();

-- ============================================================
-- Operational tables
-- ============================================================

create table if not exists public.creators (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  name            text not null,
  handle          text,
  email           text,
  city            text,
  niches          text[] default '{}',
  followers       int default 0,
  engagement_rate numeric(5,2) default 0,
  avg_deal_cents  int default 0,
  rate_card       jsonb,
  status          text not null default 'active',  -- active | onboarding | hold | archived
  bio             text,
  avatar_url      text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists creators_studio_idx on public.creators(studio_id);

create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  name                  text not null,
  industry              text,
  website               text,
  primary_contact_name  text,
  primary_contact_email text,
  status                text not null default 'active',  -- new | active | at_risk | churned
  notes                 text,
  lifetime_spend_cents  int default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists clients_studio_idx on public.clients(studio_id);

create table if not exists public.deals (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  creator_id  uuid references public.creators(id) on delete set null,
  client_id   uuid references public.clients(id) on delete set null,
  title       text not null,
  brief       text,
  stage       text not null default 'pitched',  -- pitched | negotiating | signed | delivered | paid
  value_cents int not null default 0,
  currency    text not null default 'USD',
  due_date    date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists deals_studio_idx on public.deals(studio_id);
create index if not exists deals_stage_idx  on public.deals(stage);

-- /contact submissions
create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid references public.studios(id) on delete cascade,
  topic      text not null,                          -- brand | creator | careers | press | bug | general
  from_name  text,
  from_email text,
  subject    text,
  message    text,
  niches     text[],
  status     text not null default 'new',            -- new | read | replied | closed
  source_url text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_studio_idx on public.inquiries(studio_id);
create index if not exists inquiries_topic_idx  on public.inquiries(topic);

-- /apply submissions
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid references public.studios(id) on delete cascade,
  name            text not null,
  handle          text,
  email           text,
  city            text,
  niches          text[],
  followers       int,
  engagement_rate numeric(5,2),
  pitch           text,
  links           jsonb,
  status          text not null default 'new',       -- new | review | approved | declined
  reviewer_id     uuid references auth.users(id) on delete set null,
  reviewer_notes  text,
  created_at      timestamptz not null default now()
);
create index if not exists applications_studio_idx on public.applications(studio_id);

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studios(id) on delete cascade,
  type       text not null,                          -- live | shoot | deadline | call
  title      text not null,
  creator_id uuid references public.creators(id) on delete set null,
  client_id  uuid references public.clients(id) on delete set null,
  deal_id    uuid references public.deals(id)    on delete set null,
  starts_at  timestamptz,
  ends_at    timestamptz,
  status     text not null default 'confirmed',     -- pending | confirmed | done | cancelled
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists bookings_studio_idx on public.bookings(studio_id);
create index if not exists bookings_starts_idx on public.bookings(starts_at);

create table if not exists public.contracts (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  deal_id      uuid references public.deals(id) on delete cascade,
  template     text,                                -- ugc-standard | live-booking | whitelisting | mou | bulk-msa
  status       text not null default 'draft',       -- draft | sent | signed | declined
  parties      jsonb,
  document_url text,
  signed_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists contracts_studio_idx on public.contracts(studio_id);

create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  deal_id         uuid references public.deals(id) on delete set null,
  invoice_number  text,
  amount_cents    int not null default 0,
  status          text not null default 'draft',    -- draft | sent | paid | overdue | void
  due_date        date,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists invoices_studio_idx on public.invoices(studio_id);

create table if not exists public.payouts (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  creator_id   uuid references public.creators(id) on delete set null,
  deal_id      uuid references public.deals(id) on delete set null,
  amount_cents int not null default 0,
  status       text not null default 'pending',     -- pending | paid | failed
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists payouts_studio_idx on public.payouts(studio_id);

create table if not exists public.assets (
  id               uuid primary key default gen_random_uuid(),
  studio_id        uuid not null references public.studios(id) on delete cascade,
  creator_id       uuid references public.creators(id) on delete set null,
  deal_id          uuid references public.deals(id) on delete set null,
  title            text,
  file_path        text,
  duration_seconds int,
  status           text not null default 'review',  -- draft | review | approved | whitelisted | archived
  version          int default 1,
  created_at       timestamptz not null default now()
);
create index if not exists assets_studio_idx on public.assets(studio_id);

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studios(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  type       text not null,
  body       text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_studio_idx on public.activity(studio_id);
create index if not exists activity_created_idx on public.activity(created_at desc);

-- ============================================================
-- Auto-update updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists studios_updated_at  on public.studios;
drop trigger if exists creators_updated_at on public.creators;
drop trigger if exists clients_updated_at  on public.clients;
drop trigger if exists deals_updated_at    on public.deals;

create trigger studios_updated_at  before update on public.studios  for each row execute function public.set_updated_at();
create trigger creators_updated_at before update on public.creators for each row execute function public.set_updated_at();
create trigger clients_updated_at  before update on public.clients  for each row execute function public.set_updated_at();
create trigger deals_updated_at    before update on public.deals    for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.studios        enable row level security;
alter table public.studio_members enable row level security;
alter table public.creators       enable row level security;
alter table public.clients        enable row level security;
alter table public.deals          enable row level security;
alter table public.inquiries      enable row level security;
alter table public.applications   enable row level security;
alter table public.bookings       enable row level security;
alter table public.contracts      enable row level security;
alter table public.invoices       enable row level security;
alter table public.payouts        enable row level security;
alter table public.assets         enable row level security;
alter table public.activity       enable row level security;

-- ----- studios -----
drop policy if exists studios_select_member on public.studios;
drop policy if exists studios_insert_owner  on public.studios;
drop policy if exists studios_update_owner  on public.studios;
drop policy if exists studios_delete_owner  on public.studios;

create policy studios_select_member on public.studios for select using (public.is_studio_member(id));
create policy studios_insert_owner  on public.studios for insert with check (owner_id = auth.uid());
create policy studios_update_owner  on public.studios for update using (owner_id = auth.uid());
create policy studios_delete_owner  on public.studios for delete using (owner_id = auth.uid());

-- ----- studio_members -----
drop policy if exists members_select_in_studio   on public.studio_members;
drop policy if exists members_insert_self_or_owner on public.studio_members;
drop policy if exists members_delete_owner       on public.studio_members;

create policy members_select_in_studio on public.studio_members for select
  using (public.is_studio_member(studio_id));
create policy members_insert_self_or_owner on public.studio_members for insert
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid())
  );
create policy members_delete_owner on public.studio_members for delete
  using (exists (select 1 from public.studios s where s.id = studio_id and s.owner_id = auth.uid()));

-- ----- Operational: full access for studio members -----
drop policy if exists creators_all  on public.creators;
drop policy if exists clients_all   on public.clients;
drop policy if exists deals_all     on public.deals;
drop policy if exists bookings_all  on public.bookings;
drop policy if exists contracts_all on public.contracts;
drop policy if exists invoices_all  on public.invoices;
drop policy if exists payouts_all   on public.payouts;
drop policy if exists assets_all    on public.assets;

create policy creators_all  on public.creators  for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy clients_all   on public.clients   for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy deals_all     on public.deals     for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy bookings_all  on public.bookings  for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy contracts_all on public.contracts for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy invoices_all  on public.invoices  for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy payouts_all   on public.payouts   for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy assets_all    on public.assets    for all using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));

drop policy if exists activity_select on public.activity;
drop policy if exists activity_insert on public.activity;
create policy activity_select on public.activity for select using (public.is_studio_member(studio_id));
create policy activity_insert on public.activity for insert with check (public.is_studio_member(studio_id));

-- ----- inquiries: anon INSERT (public form), members SELECT/UPDATE/DELETE -----
drop policy if exists inquiries_anon_insert    on public.inquiries;
drop policy if exists inquiries_member_select  on public.inquiries;
drop policy if exists inquiries_member_update  on public.inquiries;
drop policy if exists inquiries_member_delete  on public.inquiries;

create policy inquiries_anon_insert   on public.inquiries for insert with check (true);
create policy inquiries_member_select on public.inquiries for select
  using (studio_id is null or public.is_studio_member(studio_id));
create policy inquiries_member_update on public.inquiries for update
  using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy inquiries_member_delete on public.inquiries for delete
  using (public.is_studio_member(studio_id));

-- ----- applications: same pattern -----
drop policy if exists applications_anon_insert    on public.applications;
drop policy if exists applications_member_select  on public.applications;
drop policy if exists applications_member_update  on public.applications;
drop policy if exists applications_member_delete  on public.applications;

create policy applications_anon_insert   on public.applications for insert with check (true);
create policy applications_member_select on public.applications for select
  using (studio_id is null or public.is_studio_member(studio_id));
create policy applications_member_update on public.applications for update
  using (public.is_studio_member(studio_id)) with check (public.is_studio_member(studio_id));
create policy applications_member_delete on public.applications for delete
  using (public.is_studio_member(studio_id));

-- ============================================================
-- Storage bucket for assets (run after creating the bucket via dashboard,
-- or uncomment to create via SQL)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('assets', 'assets', false)
-- on conflict do nothing;

-- ============================================================
-- Done.
-- ============================================================
