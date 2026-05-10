-- ============================================================
-- DEMO TABLES — read-only sample data for /demo/ visitors
-- Anonymous role can SELECT everything; nobody can write.
-- Schema mirrors the real tables but has no studio_id (no multi-tenancy
-- needed) and no auth.users foreign keys.
-- ============================================================

create extension if not exists "pgcrypto";

-- ----- demo_creators -----
create table if not exists public.demo_creators (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  handle          text,
  email           text,
  city            text,
  niches          text[] default '{}',
  followers       int default 0,
  engagement_rate numeric(5,2) default 0,
  avg_deal_cents  int default 0,
  status          text not null default 'active',
  bio             text,
  avatar_url      text,
  created_at      timestamptz not null default now()
);

-- ----- demo_clients -----
create table if not exists public.demo_clients (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  industry              text,
  website               text,
  primary_contact_name  text,
  primary_contact_email text,
  status                text not null default 'active',
  notes                 text,
  lifetime_spend_cents  int default 0,
  created_at            timestamptz not null default now()
);

-- ----- demo_deals -----
create table if not exists public.demo_deals (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid references public.demo_creators(id) on delete set null,
  client_id   uuid references public.demo_clients(id)  on delete set null,
  title       text not null,
  brief       text,
  stage       text not null default 'pitched',
  value_cents int not null default 0,
  due_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ----- demo_inquiries -----
create table if not exists public.demo_inquiries (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  from_name  text,
  from_email text,
  subject    text,
  message    text,
  niches     text[],
  status     text not null default 'new',
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- ----- demo_applications -----
create table if not exists public.demo_applications (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  handle          text,
  email           text,
  city            text,
  niches          text[],
  followers       int,
  engagement_rate numeric(5,2),
  pitch           text,
  links           jsonb,
  status          text not null default 'new',
  reviewer_notes  text,
  created_at      timestamptz not null default now()
);

-- ----- demo_bookings -----
create table if not exists public.demo_bookings (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  title      text not null,
  creator_id uuid references public.demo_creators(id) on delete set null,
  client_id  uuid references public.demo_clients(id)  on delete set null,
  deal_id    uuid references public.demo_deals(id)    on delete set null,
  starts_at  timestamptz,
  ends_at    timestamptz,
  status     text not null default 'confirmed',
  notes      text,
  created_at timestamptz not null default now()
);

-- ----- demo_contracts -----
create table if not exists public.demo_contracts (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid references public.demo_deals(id) on delete cascade,
  template   text,
  status     text not null default 'draft',
  parties    jsonb,
  signed_at  timestamptz,
  created_at timestamptz not null default now()
);

-- ----- demo_invoices -----
create table if not exists public.demo_invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references public.demo_clients(id) on delete set null,
  deal_id         uuid references public.demo_deals(id)   on delete set null,
  invoice_number  text,
  amount_cents    int not null default 0,
  status          text not null default 'draft',
  due_date        date,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ----- demo_payouts -----
create table if not exists public.demo_payouts (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid references public.demo_creators(id) on delete set null,
  deal_id      uuid references public.demo_deals(id)    on delete set null,
  amount_cents int not null default 0,
  status       text not null default 'pending',
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ----- demo_assets -----
create table if not exists public.demo_assets (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid references public.demo_creators(id) on delete set null,
  deal_id          uuid references public.demo_deals(id)    on delete set null,
  title            text,
  status           text not null default 'review',
  duration_seconds int,
  version          int default 1,
  created_at       timestamptz not null default now()
);

-- ----- demo_activity -----
create table if not exists public.demo_activity (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  body       text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS — anon and authenticated can SELECT all demo tables. No writes.
-- ============================================================

alter table public.demo_creators     enable row level security;
alter table public.demo_clients      enable row level security;
alter table public.demo_deals        enable row level security;
alter table public.demo_inquiries    enable row level security;
alter table public.demo_applications enable row level security;
alter table public.demo_bookings     enable row level security;
alter table public.demo_contracts    enable row level security;
alter table public.demo_invoices     enable row level security;
alter table public.demo_payouts      enable row level security;
alter table public.demo_assets       enable row level security;
alter table public.demo_activity     enable row level security;

drop policy if exists demo_creators_anon_read     on public.demo_creators;
drop policy if exists demo_clients_anon_read      on public.demo_clients;
drop policy if exists demo_deals_anon_read        on public.demo_deals;
drop policy if exists demo_inquiries_anon_read    on public.demo_inquiries;
drop policy if exists demo_applications_anon_read on public.demo_applications;
drop policy if exists demo_bookings_anon_read     on public.demo_bookings;
drop policy if exists demo_contracts_anon_read    on public.demo_contracts;
drop policy if exists demo_invoices_anon_read     on public.demo_invoices;
drop policy if exists demo_payouts_anon_read      on public.demo_payouts;
drop policy if exists demo_assets_anon_read       on public.demo_assets;
drop policy if exists demo_activity_anon_read     on public.demo_activity;

create policy demo_creators_anon_read     on public.demo_creators     for select to anon, authenticated using (true);
create policy demo_clients_anon_read      on public.demo_clients      for select to anon, authenticated using (true);
create policy demo_deals_anon_read        on public.demo_deals        for select to anon, authenticated using (true);
create policy demo_inquiries_anon_read    on public.demo_inquiries    for select to anon, authenticated using (true);
create policy demo_applications_anon_read on public.demo_applications for select to anon, authenticated using (true);
create policy demo_bookings_anon_read     on public.demo_bookings     for select to anon, authenticated using (true);
create policy demo_contracts_anon_read    on public.demo_contracts    for select to anon, authenticated using (true);
create policy demo_invoices_anon_read     on public.demo_invoices     for select to anon, authenticated using (true);
create policy demo_payouts_anon_read      on public.demo_payouts      for select to anon, authenticated using (true);
create policy demo_assets_anon_read       on public.demo_assets       for select to anon, authenticated using (true);
create policy demo_activity_anon_read     on public.demo_activity     for select to anon, authenticated using (true);

-- ============================================================
-- SEED DATA
-- Wipes existing demo rows then inserts a fresh sample studio.
-- Re-run this section anytime to refresh the demo.
-- ============================================================

truncate table
  public.demo_activity,
  public.demo_assets,
  public.demo_payouts,
  public.demo_invoices,
  public.demo_contracts,
  public.demo_bookings,
  public.demo_applications,
  public.demo_inquiries,
  public.demo_deals,
  public.demo_clients,
  public.demo_creators
restart identity cascade;

-- ----- Creators -----
insert into public.demo_creators (id, name, handle, email, city, niches, followers, engagement_rate, avg_deal_cents, status, bio) values
  ('11111111-1111-1111-1111-000000000001', 'Maya R.',   '@mayarcreates', 'maya@example.com',   'Brooklyn, NY', ARRAY['beauty','lifestyle'], 132000, 6.20, 180000, 'active',     'Beauty + lifestyle UGC. Specializes in skincare reviews and morning routine vlogs.'),
  ('11111111-1111-1111-1111-000000000002', 'Jordan K.', '@jordankplays', 'jordan@example.com', 'Brooklyn, NY', ARRAY['tech','lifestyle'],   240000, 5.10, 240000, 'active',     'Tech-lifestyle Live host. Top performer for SaaS and DTC tech brands.'),
  ('11111111-1111-1111-1111-000000000003', 'Alex T.',   '@alexteats',    'alex@example.com',   'Austin, TX',   ARRAY['food'],                 87000, 7.80, 110000, 'active',     'Food creator focused on quick recipes and pantry staples.'),
  ('11111111-1111-1111-1111-000000000004', 'Simi O.',   '@simiblooms',   'simi@example.com',   'Atlanta, GA',  ARRAY['beauty','fashion'],    198000, 5.60, 200000, 'active',     'Beauty + fashion creator. Strong performance on color cosmetics launches.'),
  ('11111111-1111-1111-1111-000000000005', 'Devi P.',   '@devipdaily',   'devi@example.com',   'Houston, TX',  ARRAY['fitness','lifestyle'], 156000, 6.90, 160000, 'active',     'Fitness + daily life. Very high engagement on workout supplements.'),
  ('11111111-1111-1111-1111-000000000006', 'Riley S.',  '@rileythreads', 'riley@example.com',  'Brooklyn, NY', ARRAY['fashion'],              92000, 5.80,      0, 'onboarding', 'Fashion-first creator. Just joined the roster, finishing setup.'),
  ('11111111-1111-1111-1111-000000000007', 'Nia C.',    '@niacstudios',  'nia@example.com',    'Houston, TX',  ARRAY['beauty'],               22000, 8.40,  65000, 'hold',       'Micro beauty creator. Currently on hold while launching a personal brand.'),
  ('11111111-1111-1111-1111-000000000008', 'Kai M.',    '@kaimoves',     'kai@example.com',    'Miami, FL',    ARRAY['fitness'],              78000, 3.90,  90000, 'active',     'Fitness coach turned creator.');

-- ----- Clients -----
insert into public.demo_clients (id, name, industry, primary_contact_name, primary_contact_email, status, lifetime_spend_cents, notes) values
  ('22222222-2222-2222-2222-000000000001', 'Apex Home Goods', 'Home · DTC',          'Jess M.',  'jess@apexhome.co',          'active',   2480000, 'Repeat partner. Quick payment.'),
  ('22222222-2222-2222-2222-000000000002', 'Bloom & Co.',     'Beauty · DTC',        'Jess B.',  'jess@bloomco.com',          'new',           0, 'Inbound from contact form.'),
  ('22222222-2222-2222-2222-000000000003', 'Vital Proteins',  'Wellness',            'Carla R.', 'partnerships@vitalproteins.com','active',   5840000, 'Multi-quarter contract.'),
  ('22222222-2222-2222-2222-000000000004', 'Native',          'Personal care',       'Eli K.',   'eli@nativecos.com',         'active',   1220000, ''),
  ('22222222-2222-2222-2222-000000000005', 'Topicals',        'Skincare',            'Dani O.',  'brand@topicals.com',        'new',           0, 'Pre-discovery.'),
  ('22222222-2222-2222-2222-000000000006', 'Olive & Twine',   'Home · DTC',          'Mara P.',  'mara@olivetwine.com',       'at_risk',   810000, 'No response in 60+ days.'),
  ('22222222-2222-2222-2222-000000000007', 'Quartz Studio',   'Apparel',             'Iris D.',  'iris@quartz.studio',        'churned',   340000, 'Did not renew.');

-- ----- Deals -----
insert into public.demo_deals (id, creator_id, client_id, title, brief, stage, value_cents, due_date, notes) values
  ('33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000002', 'Summer hydration UGC · 3 videos',     'Three product-in-use videos for July launch.',           'pitched',     320000, '2026-07-05', 'Brand inbound, hot lead.'),
  ('33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-000000000005', '22222222-2222-2222-2222-000000000005', 'Topicals · skincare hooks',           'Honest review hooks for combo skin.',                    'pitched',     140000, '2026-07-15', ''),
  ('33333333-3333-3333-3333-000000000003', '11111111-1111-1111-1111-000000000003', '22222222-2222-2222-2222-000000000004', 'Native · UGC + Stories',              '1 Reel + 2 stories.',                                    'pitched',      95000, '2026-07-12', ''),
  ('33333333-3333-3333-3333-000000000004', '11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000001', 'Apex Home · 3 video set',             '3 lifestyle videos with home product.',                  'negotiating', 180000, '2026-06-12', '$1.8k discussed.'),
  ('33333333-3333-3333-3333-000000000005', '11111111-1111-1111-1111-000000000004', '22222222-2222-2222-2222-000000000006', 'Olive & Twine · Reel pair',           'Two reels for fall collection.',                         'negotiating', 160000, '2026-06-18', ''),
  ('33333333-3333-3333-3333-000000000006', '11111111-1111-1111-1111-000000000002', '22222222-2222-2222-2222-000000000003', 'Vital Proteins · TikTok Live',        '1hr Live shopping session.',                             'signed',      240000, '2026-06-18', 'Signed, paid 50%.'),
  ('33333333-3333-3333-3333-000000000007', '11111111-1111-1111-1111-000000000004', '22222222-2222-2222-2222-000000000002', 'Bloom · UGC pack',                    '4 videos for hydration set.',                            'delivered',   140000, '2026-06-22', 'Delivered, in QA.'),
  ('33333333-3333-3333-3333-000000000008', '11111111-1111-1111-1111-000000000005', '22222222-2222-2222-2222-000000000003', 'Vital Proteins · UGC + Live',         'UGC pack + Live combo deliverable.',                     'signed',      300000, '2026-06-22', ''),
  ('33333333-3333-3333-3333-000000000009', '11111111-1111-1111-1111-000000000005', '22222222-2222-2222-2222-000000000004', 'Native · Day-in-life',                'Single long-form day-in-life cutdown.',                  'paid',        210000, null,         'Paid May 28.'),
  ('33333333-3333-3333-3333-00000000000a', '11111111-1111-1111-1111-000000000008', '22222222-2222-2222-2222-000000000004', 'Native · Fitness POV',                'Workout-style usage clip.',                              'paid',         90000, null,         'Paid May 24.');

-- ----- Inquiries (inbox) -----
insert into public.demo_inquiries (topic, from_name, from_email, subject, message, niches, status, meta, created_at) values
  ('brand',   'Jess B.',           'jess@bloomco.com',           '3 beauty creators wanted',           'Hi! We''re launching a summer hydration set in July and would love to feature 3 of your beauty creators. Budget $3k-$4k per creator for 3 videos each.', ARRAY['beauty'],   'new',     '{"company":"Bloom & Co."}'::jsonb,        now() - interval '8 minutes'),
  ('creator', 'Sara H.',           'sara.h@gmail.com',           'Payout pending 6 days',              'Hey! My payout for the Native delivery has been showing pending for 6 days now. Can someone check on it?',                                            null,              'new',     null,                                       now() - interval '2 hours'),
  ('press',   'Lia W.',            'lia@thedrum.com',            'Profile feature for The Drum',       'Hi team — I''m working on a piece about emerging UGC roster studios and would love to feature Socio Space. Could we set up a 30-min call this week?', null,              'new',     '{"company":"The Drum"}'::jsonb,           now() - interval '5 hours'),
  ('careers', 'Marco D.',          'marco.d@protonmail.com',     'Talent Manager application',         'I saw your open Talent Manager role and have 5 years booking UGC creators at a Brooklyn agency. Resume attached.',                                    null,              'read',    null,                                       now() - interval '1 day'),
  ('brand',   'Carla R.',          'partnerships@vitalproteins.com','Q3 booking',                      'Following up on our Tuesday call. We''d like to lock 4 TikTok Live slots for July and August.',                                                       null,              'read',    '{"company":"Vital Proteins"}'::jsonb,     now() - interval '1 day 2 hours'),
  ('creator', 'Aisha M.',          'aisha.m@gmail.com',          'Profile photo update',               'Can someone help me swap my roster headshot? I sent the new one to creators@ last week but haven''t heard back.',                                       null,              'replied', '{"replies":[{"text":"Hey Aisha — sorry for the lag, swapping it now and you should see it live within the hour.","by":"you@studio.com","at":"2026-05-08T14:32:00Z"}]}'::jsonb, now() - interval '2 days'),
  ('brand',   'Dani O.',           'brand@topicals.com',         'Match request',                      'We''re looking for skincare-focused creators with under 100k who do strong honest-review hooks. Can you send some matches?',                            ARRAY['beauty'],   'read',    '{"company":"Topicals"}'::jsonb,           now() - interval '3 days'),
  ('general', 'Jamie L.',          'jamie.l@gmail.com',          'How does your roster work?',         'Hi — saw your site, just trying to understand if you handle invoicing for creators or if that''s on us.',                                              null,              'closed',  null,                                       now() - interval '4 days'),
  ('bug',     'Nina V.',           'nina@example.com',           'Apply form scroll bug on iOS',       'On Safari mobile, the niche chips overflow horizontally and feel broken. Just so you know!',                                                          null,              'closed',  null,                                       now() - interval '6 days');

-- ----- Applications -----
insert into public.demo_applications (name, handle, email, city, niches, followers, engagement_rate, pitch, links, status, reviewer_notes, created_at) values
  ('Riley S.',   '@rileythreads',   'riley@example.com',  'Brooklyn, NY', ARRAY['fashion'],                  92400,  5.80, 'Fashion creator focused on thrifted styling. Want to scale into UGC for sustainable brands.',                          '{"platform":"TikTok","rate":"$500 - $1,000","urls":["https://tiktok.com/@rileythreads"]}'::jsonb,                                                                                              'new',      null,                                                       now() - interval '1 hour'),
  ('Tasha B.',   '@tashaeats',      'tasha@example.com',  'Los Angeles',  ARRAY['food'],                     58100,  7.20, 'Food creator with viral pantry recipes. Big audience overlap with wellness brands.',                                  '{"platform":"TikTok","rate":"$200 - $500","urls":["https://tiktok.com/@tashaeats","https://instagram.com/tashaeats"]}'::jsonb,                                                                  'new',      null,                                                       now() - interval '6 hours'),
  ('Devon P.',   '@devonpdotcom',   'devon@example.com',  'Atlanta, GA',  ARRAY['fashion'],                 134000,  4.40, 'Fashion + masc style. Large following on YouTube Shorts. Great for sneaker / apparel brands.',                       '{"platform":"YouTube Shorts","rate":"$1,000 - $2,500","urls":["https://youtube.com/@devonpdotcom"]}'::jsonb,                                                                                    'review',   'Strong fit, want to align on rate band before approving.', now() - interval '1 day 3 hours'),
  ('Jules O.',   '@julesonmoney',   'jules@example.com',  'Chicago, IL',  ARRAY['finance'],                  41700,  6.10, 'Personal finance + small biz creator. Audience is 25-35 entrepreneurs.',                                              '{"platform":"Instagram","rate":"$500 - $1,000","urls":["https://instagram.com/julesonmoney"]}'::jsonb,                                                                                          'review',   '',                                                         now() - interval '2 days'),
  ('Nia C.',     '@niacstudios',    'nia@example.com',    'Houston, TX',  ARRAY['beauty'],                   22300,  8.40, 'Micro beauty creator. Specializes in textured hair and melanin-rich skin.',                                          '{"platform":"TikTok","rate":"Under $200","urls":["https://tiktok.com/@niacstudios"]}'::jsonb,                                                                                                   'review',   'Engagement is excellent, small but mighty.',               now() - interval '3 days'),
  ('Kai M.',     '@kaimoves',       'kai@example.com',    'Miami, FL',    ARRAY['fitness'],                  78500,  3.90, 'Fitness coach turned creator. Beach lifestyle vibes.',                                                              '{"platform":"Multi-platform","rate":"$500 - $1,000","urls":["https://tiktok.com/@kaimoves","https://instagram.com/kaimoves"]}'::jsonb,                                                          'approved', 'Approved — light on engagement but strong production.',    now() - interval '7 days'),
  ('Brett A.',   '@brettposts',     'brett@example.com',  null,           ARRAY['lifestyle'],                 4200,  1.20, 'Lifestyle micro account. Looking to break into UGC.',                                                                '{"platform":"TikTok","rate":"Open to discussion","urls":["https://tiktok.com/@brettposts"]}'::jsonb,                                                                                            'declined', 'Engagement under threshold for now.',                      now() - interval '7 days');

-- ----- Bookings (calendar) -----
insert into public.demo_bookings (type, title, creator_id, client_id, deal_id, starts_at, status, notes) values
  ('live',     'TikTok Live · Vital Proteins',     '11111111-1111-1111-1111-000000000002', '22222222-2222-2222-2222-000000000003', '33333333-3333-3333-3333-000000000006', date_trunc('month', now()) + interval '17 days 19 hours',  'confirmed', '1hr live shopping.'),
  ('shoot',    'Shoot day · Apex Home Goods',      '11111111-1111-1111-1111-000000000001', '22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000004', date_trunc('month', now()) + interval '8 days 14 hours',   'confirmed', 'In-home shoot.'),
  ('live',     'TikTok Live · Native',             '11111111-1111-1111-1111-000000000002', '22222222-2222-2222-2222-000000000004', null,                                   date_trunc('month', now()) + interval '3 days 23 hours',   'pending',   ''),
  ('deadline', 'Devi · Fenty due',                 '11111111-1111-1111-1111-000000000005', null,                                   null,                                   date_trunc('month', now()) + interval '4 days 12 hours',   'pending',   'Final delivery deadline.'),
  ('live',     'TikTok Live · Tasha · Vital',      null,                                   '22222222-2222-2222-2222-000000000003', null,                                   date_trunc('month', now()) + interval '21 days 18 hours',  'confirmed', ''),
  ('shoot',    'Simi · Bloom shoot',               '11111111-1111-1111-1111-000000000004', '22222222-2222-2222-2222-000000000002', null,                                   date_trunc('month', now()) + interval '8 days 10 hours',   'confirmed', '');

-- ----- Contracts -----
insert into public.demo_contracts (deal_id, template, status, parties, signed_at) values
  ('33333333-3333-3333-3333-000000000004', 'ugc-standard',     'sent',   '{"creator":"Maya R.","client":"Apex Home Goods"}'::jsonb,        null),
  ('33333333-3333-3333-3333-000000000006', 'live-booking',     'signed', '{"creator":"Jordan K.","client":"Vital Proteins"}'::jsonb,       now() - interval '3 hours'),
  ('33333333-3333-3333-3333-000000000007', 'ugc-standard',     'signed', '{"creator":"Simi O.","client":"Bloom & Co."}'::jsonb,            now() - interval '1 day'),
  ('33333333-3333-3333-3333-000000000003', 'ugc-standard',     'sent',   '{"creator":"Alex T.","client":"Native"}'::jsonb,                 null),
  ('33333333-3333-3333-3333-000000000002', 'ugc-standard',     'draft',  '{"creator":"Devi P.","client":"Topicals"}'::jsonb,               null);

-- ----- Invoices -----
insert into public.demo_invoices (client_id, deal_id, invoice_number, amount_cents, status, sent_at, paid_at) values
  ('22222222-2222-2222-2222-000000000003', '33333333-3333-3333-3333-000000000006', '#0048', 240000, 'paid',    now() - interval '2 days', now() - interval '1 day'),
  ('22222222-2222-2222-2222-000000000001', '33333333-3333-3333-3333-000000000004', '#0047', 180000, 'sent',    now() - interval '4 days', null),
  ('22222222-2222-2222-2222-000000000002', '33333333-3333-3333-3333-000000000007', '#0046', 140000, 'sent',    now() - interval '11 days',null),
  ('22222222-2222-2222-2222-000000000006', null,                                   '#0045', 160000, 'overdue', now() - interval '17 days',null),
  ('22222222-2222-2222-2222-000000000004', '33333333-3333-3333-3333-000000000009', '#0044', 210000, 'paid',    now() - interval '11 days',now() - interval '11 days');

-- ----- Payouts -----
insert into public.demo_payouts (creator_id, deal_id, amount_cents, status, paid_at) values
  ('11111111-1111-1111-1111-000000000001', '33333333-3333-3333-3333-000000000004', 144000, 'pending', null),
  ('11111111-1111-1111-1111-000000000002', '33333333-3333-3333-3333-000000000006', 192000, 'pending', null),
  ('11111111-1111-1111-1111-000000000003', '33333333-3333-3333-3333-000000000003',  76000, 'pending', null),
  ('11111111-1111-1111-1111-000000000004', '33333333-3333-3333-3333-000000000007', 112000, 'pending', null),
  ('11111111-1111-1111-1111-000000000005', '33333333-3333-3333-3333-000000000009', 168000, 'paid',    now() - interval '11 days');

-- ----- Assets (content library) -----
insert into public.demo_assets (creator_id, deal_id, title, status, duration_seconds, version) values
  ('11111111-1111-1111-1111-000000000001', '33333333-3333-3333-3333-000000000004', 'Maya · Apex hero hook',     'approved',     24, 3),
  ('11111111-1111-1111-1111-000000000002', '33333333-3333-3333-3333-000000000006', 'Jordan · Vital review',     'approved',     38, 1),
  ('11111111-1111-1111-1111-000000000004', '33333333-3333-3333-3333-000000000007', 'Simi · Bloom hydration',    'review',       31, 2),
  ('11111111-1111-1111-1111-000000000003', '33333333-3333-3333-3333-000000000003', 'Alex · Native unbox',       'review',       18, 1),
  ('11111111-1111-1111-1111-000000000005', '33333333-3333-3333-3333-000000000009', 'Devi · Fenty get-ready',    'whitelisted',  42, 4),
  ('11111111-1111-1111-1111-000000000001', '33333333-3333-3333-3333-000000000004', 'Maya · Apex POV cutdown',   'review',       22, 1),
  ('11111111-1111-1111-1111-000000000008', '33333333-3333-3333-3333-00000000000a', 'Kai · Native day-in-life',  'approved',     46, 2);

-- ----- Activity feed -----
insert into public.demo_activity (type, body, created_at) values
  ('inquiry.received',     'New inquiry from Bloom & Co. — interested in 3 beauty creators for summer campaign.', now() - interval '8 minutes'),
  ('deal.delivered',       'Maya R. delivered 3 videos for Apex Home Goods — review queue.',                       now() - interval '42 minutes'),
  ('application.received', 'Application received from Riley S. — fashion / lifestyle, 92k.',                       now() - interval '1 hour'),
  ('contract.signed',      'Contract signed: Vital Proteins × Jordan K. — $2,400 booked.',                         now() - interval '3 hours'),
  ('booking.confirmed',    'Booking confirmed for Tuesday 3:00 PM — TikTok Live with Tasha B.',                    now() - interval '5 hours'),
  ('payout.sent',          'Payout sent: $1,680 to Devi P. for Native delivery.',                                  now() - interval '1 day'),
  ('inquiry.replied',      'Replied to Aisha M. about profile photo update.',                                      now() - interval '2 days'),
  ('client.added',         'Client added: Topicals.',                                                              now() - interval '3 days');

-- Done.
