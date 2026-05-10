# Socio Space — Phase 1 Marketplace (Next.js)

The two-sided UGC creator marketplace. This is the new app being built per
the Phase 1 spec. The legacy static site lives at the parent repo's root and
will eventually be retired (or moved into `public/legacy/`).

## Setup

```bash
cd web
cp .env.local.example .env.local   # then fill in keys (Supabase service role, Stripe, Resend)
npm install
npm run dev                         # → http://localhost:3000
```

## Stack

| Concern | Tool |
| --- | --- |
| Framework | Next.js 14 (app router, RSC) |
| Language | TypeScript |
| Styles | Tailwind CSS — brand tokens in `tailwind.config.ts` |
| Auth + DB | Supabase (`@supabase/ssr` for cookie-based sessions) |
| Storage | Supabase Storage buckets: `avatars`, `portfolio`, `logos` |
| Payments | Stripe (Checkout + Customer Portal + webhooks) |
| Email | Resend (transactional) |
| Forms | react-hook-form + zod |
| Icons | lucide-react |

## Routing (planned)

```
/                       public marketing
/jobs                   public job board
/creators               public creator directory
/creators/[id]          public creator profile
/login                  sign in
/signup                 sign up (role selector: creator | brand)
/onboarding/creator     6-step creator onboarding
/onboarding/brand       4-step brand onboarding (incl. Stripe checkout)
/dashboard/creator/*    creator dashboard (overview, profile, jobs, applications, deals, pitches, invoices, earnings, notifications, settings)
/dashboard/brand/*      brand dashboard (overview, search, saved, post-job, my-jobs, applications, campaigns, billing, notifications, settings)
/api/*                  server actions + webhooks
/api/stripe/webhooks    Stripe event handler
```

## Migrations

Run in Supabase SQL Editor in this order if starting fresh:

1. `../supabase/migrations/0001_initial.sql` — admin OS schema
2. `../supabase/migrations/0002_demo_tables.sql` — public demo data
3. `../supabase/migrations/0003_demo_leads.sql` — demo lead capture
4. `../supabase/migrations/0004_marketplace.sql` — Phase 1 marketplace

## Design system

Brand tokens live in `tailwind.config.ts` and `app/globals.css` (CSS custom
properties so legacy markup using `var(--*)` keeps working). DO NOT change
colors, fonts, or styling without checking the existing site — the look is
already locked.

| Token | Value |
| --- | --- |
| `bg-cream` | `#FFF7DE` (page background) |
| `text-ink` | `#161616` (body text) |
| `bg-yellow` | `#FCD735` (primary accent) |
| `bg-pink-bright` | `#FF5C95` (secondary accent / brand CTA) |
| `bg-mint-deep` | `#3DBD9C` (success) |
| `font-display` | Archivo Black (headlines, CTAs) |
| `font-body` | DM Sans (paragraphs, UI) |
| `font-script` | Caveat (handwritten accents) |

## Companion projects in the parent repo

- `/index.html`, `/brands.html`, etc. — legacy static marketing site
- `/os/` — internal admin tool (formerly customer-facing, now Socio Space's own)
- `/demo/` — read-only marketplace demo (separate from this Next.js app)
- `/supabase/migrations/` — shared migration files
