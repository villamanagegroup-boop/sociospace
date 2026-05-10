-- ============================================================
-- 0004_marketplace.sql
-- Phase 1 marketplace schema. Two-sided creator + brand marketplace.
--
-- This migration:
--   1. Renames the four agency-OS tables that collide with marketplace
--      names (creators, applications, deals, invoices) to admin_*. The
--      /os/ workspace becomes our internal admin tool only — it's no
--      longer a customer-facing product. Foreign keys in the other OS
--      tables (bookings, contracts, payouts, assets, etc.) remain valid
--      after the rename because Postgres tracks references by table OID.
--   2. Creates the public marketplace schema per the Phase 1 spec.
--   3. Adds RLS policies, updated_at triggers, and notification triggers.
--   4. Creates Supabase Storage buckets for avatars, portfolio, and logos.
--
-- After running this, the /os/ JavaScript needs its queries updated to
-- read from admin_* table names (followup work — not in this migration).
--
-- Run AFTER 0001 / 0002 / 0003.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- SECTION 1 — Rename agency-OS collisions to admin_*
-- ============================================================
alter table if exists public.creators     rename to admin_creators;
alter table if exists public.applications rename to admin_applications;
alter table if exists public.deals        rename to admin_deals;
alter table if exists public.invoices     rename to admin_invoices;


-- ============================================================
-- SECTION 2 — Marketplace tables
-- ============================================================

-- ----- waitlist (homepage signup before launch / for unauthenticated leads) -----
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        text not null check (role in ('creator', 'brand')),
  source      text,                          -- e.g. 'homepage', 'referral'
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create unique index if not exists waitlist_email_role_idx on public.waitlist(email, role);

-- ----- creators (one row per authed creator user) -----
create table if not exists public.creators (
  id                       uuid primary key references auth.users(id) on delete cascade,
  full_name                text,
  bio                      text,
  niche_tags               text[]      default '{}',
  platforms                text[]      default '{}',     -- tiktok | instagram | youtube | ugc_only | etc
  content_types            text[]      default '{}',     -- short_video | long_video | static | story | live | ugc | testimonial
  location                 text,
  availability             text not null default 'open' check (availability in ('open','selective','unavailable')),
  availability_note        text,
  profile_photo_url        text,
  portfolio_urls           text[]      default '{}',
  response_rate            int default 0 check (response_rate    between 0 and 100),
  completion_rate          int default 0 check (completion_rate  between 0 and 100),
  visibility               text not null default 'public' check (visibility in ('public','private')),
  -- Subscription
  stripe_customer_id       text,
  stripe_subscription_id   text,
  subscription_status      text default 'free',          -- free | pro | pro_plus | past_due | canceled
  -- Analytics summary (refreshed periodically)
  views_total              int default 0,
  views_this_week          int default 0,
  saves_total              int default 0,
  search_appearances_week  int default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ----- creator_rates (line items per creator) -----
create table if not exists public.creator_rates (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.creators(id) on delete cascade,
  content_type  text not null,
  rate_cents    int  not null check (rate_cents >= 0),
  description   text,
  sort_order    int  default 0,
  created_at    timestamptz not null default now()
);
create index if not exists creator_rates_creator_idx on public.creator_rates(creator_id);

-- ----- brands (one row per authed brand user) -----
create table if not exists public.brands (
  id                          uuid primary key references auth.users(id) on delete cascade,
  company_name                text,
  website                     text,
  industry                    text,
  logo_url                    text,
  bio                         text,
  budget_range                text,                       -- '$0-1k' | '$1-5k' | '$5-25k' | '$25k+'
  preferred_content_types     text[] default '{}',
  preferred_niches            text[] default '{}',
  verified                    boolean not null default false,
  -- Subscription
  stripe_customer_id          text,
  stripe_subscription_id      text,
  subscription_status         text default 'inactive',    -- inactive | basic | pro | enterprise | past_due | canceled
  -- Usage tracking (resets monthly)
  contacts_used_this_period   int default 0,
  posts_used_this_period      int default 0,
  usage_period_start          timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ----- jobs (posted by brands) -----
create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands(id) on delete cascade,
  title           text not null,
  description     text,
  content_type    text[] default '{}',
  niche_tags      text[] default '{}',
  platform        text[] default '{}',
  rate_min_cents  int    default 0,
  rate_max_cents  int    default 0,
  deadline        timestamptz,
  slots_available int    default 1,
  status          text not null default 'open' check (status in ('open','closed','filled','draft')),
  visibility      text not null default 'public' check (visibility in ('public','invite_only')),
  views_count     int    default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists jobs_brand_idx       on public.jobs(brand_id);
create index if not exists jobs_status_idx      on public.jobs(status);
create index if not exists jobs_niche_gin       on public.jobs using gin(niche_tags);
create index if not exists jobs_content_gin     on public.jobs using gin(content_type);
create index if not exists jobs_platform_gin    on public.jobs using gin(platform);

-- ----- applications (creator → job) -----
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  creator_id    uuid not null references public.creators(id) on delete cascade,
  status        text not null default 'applied' check (status in ('applied','reviewing','accepted','rejected','withdrawn')),
  cover_note    text,
  brand_notes   text,                         -- internal, brand-only
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, creator_id)
);
create index if not exists applications_job_idx     on public.applications(job_id);
create index if not exists applications_creator_idx on public.applications(creator_id);
create index if not exists applications_status_idx  on public.applications(status);

-- ----- campaigns (brand-side groupings of deals) -----
create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands(id) on delete cascade,
  name          text not null,
  description   text,
  budget_cents  int  default 0,
  start_date    date,
  end_date      date,
  status        text default 'active' check (status in ('active','completed','cancelled','draft')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists campaigns_brand_idx on public.campaigns(brand_id);

-- ----- deals (creator ↔ brand, direct) -----
create table if not exists public.deals (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands(id) on delete cascade,
  creator_id      uuid not null references public.creators(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  campaign_id     uuid references public.campaigns(id) on delete set null,
  title           text not null,
  deliverables    text[] default '{}',
  rate_cents      int not null default 0,
  deadline        timestamptz,
  status          text not null default 'pitched' check (status in ('pitched','negotiating','active','delivered','paid','cancelled')),
  revision_rounds int default 2,
  revisions_used  int default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists deals_brand_idx    on public.deals(brand_id);
create index if not exists deals_creator_idx  on public.deals(creator_id);
create index if not exists deals_status_idx   on public.deals(status);
create index if not exists deals_campaign_idx on public.deals(campaign_id);

-- ----- invoices (creator → brand) -----
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  deal_id         uuid references public.deals(id) on delete set null,
  creator_id      uuid not null references public.creators(id) on delete cascade,
  brand_id        uuid references public.brands(id) on delete set null,
  invoice_number  text,
  amount_cents    int not null default 0,
  status          text not null default 'draft' check (status in ('draft','sent','paid','overdue','void')),
  due_date        date,
  line_items      jsonb default '[]'::jsonb,
  notes           text,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists invoices_creator_idx on public.invoices(creator_id);
create index if not exists invoices_brand_idx   on public.invoices(brand_id);

-- ----- saved_creators (brand bookmarks) -----
create table if not exists public.saved_creators (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  creator_id  uuid not null references public.creators(id) on delete cascade,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (brand_id, creator_id)
);

-- ----- saved_jobs (creator bookmarks) -----
create table if not exists public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creators(id) on delete cascade,
  job_id      uuid not null references public.jobs(id)     on delete cascade,
  created_at  timestamptz not null default now(),
  unique (creator_id, job_id)
);

-- ----- pitches (creator outreach log) -----
create table if not exists public.pitches (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references public.creators(id) on delete cascade,
  brand_name      text not null,
  contact_name    text,
  contact_email   text,
  platform        text,
  status          text not null default 'drafted' check (status in ('drafted','sent','followed_up','responded','closed')),
  template_used   text,
  notes           text,
  follow_up_date  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists pitches_creator_idx on public.pitches(creator_id);

-- ----- pitch_templates -----
create table if not exists public.pitch_templates (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creators(id) on delete cascade,
  name        text not null,
  niche       text,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pitch_templates_creator_idx on public.pitch_templates(creator_id);

-- ----- notifications (per-user) -----
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                -- application_received | application_status_changed | creator_saved | deal_status_updated | invoice_paid | new_matching_job | platform_announcement
  title       text not null,
  message     text,
  link        text,
  read        boolean not null default false,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx       on public.notifications(user_id) where read = false;


-- ============================================================
-- SECTION 3 — updated_at triggers
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists creators_touch         on public.creators;
drop trigger if exists brands_touch           on public.brands;
drop trigger if exists jobs_touch             on public.jobs;
drop trigger if exists applications_touch     on public.applications;
drop trigger if exists deals_touch            on public.deals;
drop trigger if exists campaigns_touch        on public.campaigns;
drop trigger if exists invoices_touch         on public.invoices;
drop trigger if exists pitches_touch          on public.pitches;
drop trigger if exists pitch_templates_touch  on public.pitch_templates;

create trigger creators_touch         before update on public.creators         for each row execute function public.touch_updated_at();
create trigger brands_touch           before update on public.brands           for each row execute function public.touch_updated_at();
create trigger jobs_touch             before update on public.jobs             for each row execute function public.touch_updated_at();
create trigger applications_touch     before update on public.applications     for each row execute function public.touch_updated_at();
create trigger deals_touch            before update on public.deals            for each row execute function public.touch_updated_at();
create trigger campaigns_touch        before update on public.campaigns        for each row execute function public.touch_updated_at();
create trigger invoices_touch         before update on public.invoices         for each row execute function public.touch_updated_at();
create trigger pitches_touch          before update on public.pitches          for each row execute function public.touch_updated_at();
create trigger pitch_templates_touch  before update on public.pitch_templates  for each row execute function public.touch_updated_at();


-- ============================================================
-- SECTION 4 — Notification triggers (security definer so they bypass RLS)
-- ============================================================

-- Brand gets notified when a creator applies to their job
create or replace function public.notify_brand_on_application()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_brand_id     uuid;
  v_job_title    text;
  v_creator_name text;
begin
  select brand_id, title into v_brand_id, v_job_title from public.jobs where id = new.job_id;
  select full_name into v_creator_name from public.creators where id = new.creator_id;
  if v_brand_id is not null then
    insert into public.notifications (user_id, type, title, message, link, meta)
    values (
      v_brand_id,
      'application_received',
      'New application',
      coalesce(v_creator_name, 'A creator') || ' applied to ' || coalesce(v_job_title, 'your job'),
      '/dashboard/brand/applications',
      jsonb_build_object('application_id', new.id, 'job_id', new.job_id, 'creator_id', new.creator_id)
    );
  end if;
  return new;
end $$;

drop trigger if exists applications_notify_brand on public.applications;
create trigger applications_notify_brand
  after insert on public.applications
  for each row execute function public.notify_brand_on_application();

-- Creator gets notified when their application status changes
create or replace function public.notify_creator_on_application_status()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_job_title text;
begin
  if new.status is distinct from old.status then
    select title into v_job_title from public.jobs where id = new.job_id;
    insert into public.notifications (user_id, type, title, message, link, meta)
    values (
      new.creator_id,
      'application_status_changed',
      'Application ' || new.status,
      'Your application to "' || coalesce(v_job_title, 'a job') || '" was marked ' || new.status,
      '/dashboard/creator/applications',
      jsonb_build_object('application_id', new.id, 'status', new.status, 'job_id', new.job_id)
    );
  end if;
  return new;
end $$;

drop trigger if exists applications_notify_creator on public.applications;
create trigger applications_notify_creator
  after update on public.applications
  for each row execute function public.notify_creator_on_application_status();

-- Creator gets notified when a brand saves their profile
create or replace function public.notify_creator_on_save()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_brand_name text;
begin
  select coalesce(company_name, 'A brand') into v_brand_name from public.brands where id = new.brand_id;
  insert into public.notifications (user_id, type, title, message, link, meta)
  values (
    new.creator_id,
    'creator_saved',
    'Saved by a brand',
    v_brand_name || ' saved your profile',
    '/dashboard/creator/profile',
    jsonb_build_object('brand_id', new.brand_id)
  );
  -- Increment saves_total counter
  update public.creators set saves_total = saves_total + 1 where id = new.creator_id;
  return new;
end $$;

drop trigger if exists saved_creators_notify on public.saved_creators;
create trigger saved_creators_notify
  after insert on public.saved_creators
  for each row execute function public.notify_creator_on_save();

-- Both parties get notified when a deal status changes
create or replace function public.notify_on_deal_status()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.status is distinct from old.status then
    -- Notify creator
    insert into public.notifications (user_id, type, title, message, link, meta)
    values (
      new.creator_id,
      'deal_status_updated',
      'Deal ' || new.status,
      '"' || new.title || '" was marked ' || new.status,
      '/dashboard/creator/deals',
      jsonb_build_object('deal_id', new.id, 'status', new.status)
    );
    -- Notify brand
    insert into public.notifications (user_id, type, title, message, link, meta)
    values (
      new.brand_id,
      'deal_status_updated',
      'Deal ' || new.status,
      '"' || new.title || '" was marked ' || new.status,
      '/dashboard/brand/campaigns',
      jsonb_build_object('deal_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end $$;

drop trigger if exists deals_notify_on_status on public.deals;
create trigger deals_notify_on_status
  after update on public.deals
  for each row execute function public.notify_on_deal_status();

-- Creator gets notified when their invoice is marked paid
create or replace function public.notify_creator_on_invoice_paid()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    insert into public.notifications (user_id, type, title, message, link, meta)
    values (
      new.creator_id,
      'invoice_paid',
      'Invoice paid',
      coalesce(new.invoice_number, 'Invoice') || ' was paid · $' || (new.amount_cents / 100.0)::numeric(10,2),
      '/dashboard/creator/invoices',
      jsonb_build_object('invoice_id', new.id, 'amount_cents', new.amount_cents)
    );
  end if;
  return new;
end $$;

drop trigger if exists invoices_notify_paid on public.invoices;
create trigger invoices_notify_paid
  after update on public.invoices
  for each row execute function public.notify_creator_on_invoice_paid();


-- ============================================================
-- SECTION 5 — Row Level Security
-- ============================================================

alter table public.waitlist        enable row level security;
alter table public.creators        enable row level security;
alter table public.creator_rates   enable row level security;
alter table public.brands          enable row level security;
alter table public.jobs            enable row level security;
alter table public.applications    enable row level security;
alter table public.deals           enable row level security;
alter table public.campaigns       enable row level security;
alter table public.invoices        enable row level security;
alter table public.saved_creators  enable row level security;
alter table public.saved_jobs      enable row level security;
alter table public.pitches         enable row level security;
alter table public.pitch_templates enable row level security;
alter table public.notifications   enable row level security;

-- Defensive drops for re-runs
drop policy if exists waitlist_anon_insert         on public.waitlist;
drop policy if exists creators_public_read         on public.creators;
drop policy if exists creators_self_insert         on public.creators;
drop policy if exists creators_self_update         on public.creators;
drop policy if exists creators_self_delete         on public.creators;
drop policy if exists creator_rates_public_read    on public.creator_rates;
drop policy if exists creator_rates_self_manage    on public.creator_rates;
drop policy if exists brands_public_read           on public.brands;
drop policy if exists brands_self_insert           on public.brands;
drop policy if exists brands_self_update           on public.brands;
drop policy if exists brands_self_delete           on public.brands;
drop policy if exists jobs_public_read_open        on public.jobs;
drop policy if exists jobs_brand_manage            on public.jobs;
drop policy if exists applications_creator_select  on public.applications;
drop policy if exists applications_brand_select    on public.applications;
drop policy if exists applications_creator_insert  on public.applications;
drop policy if exists applications_creator_update  on public.applications;
drop policy if exists applications_brand_update    on public.applications;
drop policy if exists deals_parties_select         on public.deals;
drop policy if exists deals_parties_insert         on public.deals;
drop policy if exists deals_parties_update         on public.deals;
drop policy if exists campaigns_brand_manage       on public.campaigns;
drop policy if exists invoices_creator_manage      on public.invoices;
drop policy if exists invoices_brand_select        on public.invoices;
drop policy if exists invoices_brand_update        on public.invoices;
drop policy if exists saved_creators_brand         on public.saved_creators;
drop policy if exists saved_jobs_creator           on public.saved_jobs;
drop policy if exists pitches_creator              on public.pitches;
drop policy if exists pitch_templates_creator      on public.pitch_templates;
drop policy if exists notifications_recipient      on public.notifications;
drop policy if exists notifications_recipient_upd  on public.notifications;

-- ----- waitlist -----
create policy waitlist_anon_insert on public.waitlist
  for insert to anon, authenticated with check (true);

-- ----- creators -----
create policy creators_public_read on public.creators
  for select to anon, authenticated using (visibility = 'public' or id = auth.uid());

create policy creators_self_insert on public.creators
  for insert to authenticated with check (id = auth.uid());

create policy creators_self_update on public.creators
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy creators_self_delete on public.creators
  for delete to authenticated using (id = auth.uid());

-- ----- creator_rates: rate cards inherit visibility from creator -----
create policy creator_rates_public_read on public.creator_rates
  for select to anon, authenticated
  using (exists (select 1 from public.creators c where c.id = creator_rates.creator_id and (c.visibility = 'public' or c.id = auth.uid())));

create policy creator_rates_self_manage on public.creator_rates
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- ----- brands: public-readable for job context, self-write only -----
create policy brands_public_read on public.brands
  for select to anon, authenticated using (true);

create policy brands_self_insert on public.brands
  for insert to authenticated with check (id = auth.uid());

create policy brands_self_update on public.brands
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy brands_self_delete on public.brands
  for delete to authenticated using (id = auth.uid());

-- ----- jobs: open public jobs visible to all; brand manages own -----
create policy jobs_public_read_open on public.jobs
  for select to anon, authenticated
  using ((status = 'open' and visibility = 'public') or brand_id = auth.uid());

create policy jobs_brand_manage on public.jobs
  for all to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

-- ----- applications: visible to applying creator + job's brand -----
create policy applications_creator_select on public.applications
  for select to authenticated using (creator_id = auth.uid());

create policy applications_brand_select on public.applications
  for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = applications.job_id and j.brand_id = auth.uid()));

create policy applications_creator_insert on public.applications
  for insert to authenticated
  with check (creator_id = auth.uid());

-- Creator can withdraw (transition applied → withdrawn) on their own apps
create policy applications_creator_update on public.applications
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- Brand can update apps to their own jobs (status changes)
create policy applications_brand_update on public.applications
  for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = applications.job_id and j.brand_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = applications.job_id and j.brand_id = auth.uid()));

-- ----- deals: both parties read + write -----
create policy deals_parties_select on public.deals
  for select to authenticated
  using (creator_id = auth.uid() or brand_id = auth.uid());

create policy deals_parties_insert on public.deals
  for insert to authenticated
  with check (creator_id = auth.uid() or brand_id = auth.uid());

create policy deals_parties_update on public.deals
  for update to authenticated
  using (creator_id = auth.uid() or brand_id = auth.uid())
  with check (creator_id = auth.uid() or brand_id = auth.uid());

-- ----- campaigns: brand only -----
create policy campaigns_brand_manage on public.campaigns
  for all to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

-- ----- invoices: creator manages, brand reads + can mark paid -----
create policy invoices_creator_manage on public.invoices
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy invoices_brand_select on public.invoices
  for select to authenticated
  using (brand_id = auth.uid());

create policy invoices_brand_update on public.invoices
  for update to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

-- ----- saved_creators: brand only -----
create policy saved_creators_brand on public.saved_creators
  for all to authenticated
  using (brand_id = auth.uid())
  with check (brand_id = auth.uid());

-- ----- saved_jobs: creator only -----
create policy saved_jobs_creator on public.saved_jobs
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- ----- pitches + pitch_templates: creator only -----
create policy pitches_creator on public.pitches
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy pitch_templates_creator on public.pitch_templates
  for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

-- ----- notifications: recipient only (insert handled via security definer triggers) -----
create policy notifications_recipient on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_recipient_upd on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- SECTION 6 — Storage buckets + policies
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars',   'avatars',   true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('logos',     'logos',     true) on conflict (id) do nothing;

-- Each bucket: anyone can read; authed users can write to a folder named with their user id
-- Path convention: <user_id>/<filename>

drop policy if exists "avatars: public read"     on storage.objects;
drop policy if exists "avatars: own write"       on storage.objects;
drop policy if exists "avatars: own update"      on storage.objects;
drop policy if exists "avatars: own delete"      on storage.objects;

drop policy if exists "portfolio: public read"   on storage.objects;
drop policy if exists "portfolio: own write"     on storage.objects;
drop policy if exists "portfolio: own update"    on storage.objects;
drop policy if exists "portfolio: own delete"    on storage.objects;

drop policy if exists "logos: public read"       on storage.objects;
drop policy if exists "logos: own write"         on storage.objects;
drop policy if exists "logos: own update"        on storage.objects;
drop policy if exists "logos: own delete"        on storage.objects;

create policy "avatars: public read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: own write"     on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars'  and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own update"    on storage.objects for update to authenticated
  using      (bucket_id = 'avatars'  and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own delete"    on storage.objects for delete to authenticated
  using      (bucket_id = 'avatars'  and (storage.foldername(name))[1] = auth.uid()::text);

create policy "portfolio: public read" on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio: own write"   on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio: own update"  on storage.objects for update to authenticated
  using      (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio: own delete"  on storage.objects for delete to authenticated
  using      (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: public read"     on storage.objects for select using (bucket_id = 'logos');
create policy "logos: own write"       on storage.objects for insert to authenticated
  with check (bucket_id = 'logos'     and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own update"      on storage.objects for update to authenticated
  using      (bucket_id = 'logos'     and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own delete"      on storage.objects for delete to authenticated
  using      (bucket_id = 'logos'     and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- Done.
--
-- Followups (NOT in this migration):
--   - Update /os/os.js queries to read from admin_creators, admin_applications,
--     admin_deals, admin_invoices.
--   - Stripe products + price IDs (set up in Stripe dashboard, then store
--     price IDs in code).
--   - Service-role server function for Stripe webhooks → updates
--     creators/brands subscription_status fields.
-- ============================================================
