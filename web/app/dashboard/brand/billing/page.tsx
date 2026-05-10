import Link from 'next/link';
import { requireUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import { BRAND_PLANS, getPlan } from '@/lib/stripe/config';
import StripePortalButton from '@/components/ui/StripePortalButton';

export default async function BrandBillingPage() {
  const user = await requireUser('brand');
  const supabase = createClient();
  const { data: brand } = await supabase
    .from('brands')
    .select('subscription_status, contacts_used_this_period, posts_used_this_period, usage_period_start')
    .eq('id', user.id)
    .maybeSingle();

  // subscription_status is either '<tier>' or '<tier>_pending' during the
  // dev placeholder window (real Stripe sync replaces this with 'active' /
  // 'past_due' / 'canceled' once webhooks land).
  const status = brand?.subscription_status ?? 'inactive';
  const tier   = status.replace(/_pending$/, '').replace(/_active$/, '');
  const plan   = getPlan(tier as any);
  const isPending = status.endsWith('_pending');

  const limits = {
    basic:      { posts: 3,  contacts: 10  },
    pro:        { posts: Number.POSITIVE_INFINITY, contacts: Number.POSITIVE_INFINITY },
    enterprise: { posts: Number.POSITIVE_INFINITY, contacts: Number.POSITIVE_INFINITY }
  } as Record<string, { posts: number; contacts: number }>;
  const limit = plan ? limits[plan.id] : null;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard/brand" className="text-sm text-ink-3 hover:text-ink mb-2 inline-block">← Dashboard</Link>
            <h1 className="font-display text-3xl">Billing</h1>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-outline">Sign out</button>
          </form>
        </header>

        {/* Current plan card */}
        <div className="bg-white border-2 border-ink rounded-xl shadow-ink-4 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-ink-3 font-semibold">Current plan</span>
              <div className="font-display text-2xl mt-1">
                {plan ? plan.name : 'No plan yet'}
                {isPending && (
                  <span className="ml-2 text-xs bg-yellow text-ink rounded-pill px-2 py-0.5 align-middle">
                    Checkout pending
                  </span>
                )}
              </div>
              {plan && (
                <div className="text-ink-3 text-sm">
                  {plan.priceLabel}{plan.cadenceLabel} · {plan.tagline}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <StripePortalButton>Manage billing</StripePortalButton>
            </div>
          </div>

          {plan && (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-ink-2 mb-4">
              {plan.features.map(f => (
                <li key={f} className="flex gap-1.5">
                  <span className="text-mint-deep flex-shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
          )}

          {isPending && (
            <div className="bg-cream-2 border border-ink/10 rounded-lg p-3 text-xs text-ink-3">
              Stripe checkout isn't wired up yet. Your plan choice is recorded and
              you'll get a reminder to complete payment as soon as it's live. All
              brand features are open during this dev period.
            </div>
          )}
        </div>

        {/* Usage card */}
        {plan && limit && (
          <div className="bg-white border border-ink/15 rounded-xl p-6 mb-6">
            <h2 className="font-display text-base mb-4">Usage this month</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <UsageBar
                label="Job posts"
                used={brand?.posts_used_this_period ?? 0}
                limit={limit.posts}
              />
              <UsageBar
                label="Contact unlocks"
                used={brand?.contacts_used_this_period ?? 0}
                limit={limit.contacts}
              />
            </div>
          </div>
        )}

        {/* Plan comparison + upgrade options */}
        <div className="bg-white border border-ink/15 rounded-xl p-6 mb-6">
          <h2 className="font-display text-base mb-4">Switch plans</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {BRAND_PLANS.map(p => {
              const isCurrent = plan?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`border-2 rounded-xl p-4 ${
                    isCurrent ? 'bg-yellow border-ink' : 'border-ink/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-base">{p.name}</span>
                    {isCurrent && <span className="text-[10px] font-display tracking-wider bg-ink text-cream rounded-pill px-2 py-0.5">CURRENT</span>}
                  </div>
                  <div className="font-display text-xl mb-2">
                    {p.priceLabel}<span className="text-xs font-normal text-ink-3">{p.cadenceLabel}</span>
                  </div>
                  <ul className="text-xs text-ink-2 space-y-1 mb-3">
                    {p.features.map(f => (
                      <li key={f} className="flex gap-1.5">
                        <span className="text-mint-deep flex-shrink-0">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <StripePortalButton className="btn-outline w-full justify-center text-xs">
                      Switch to {p.name}
                    </StripePortalButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice history (stub) */}
        <div className="bg-white border border-ink/15 rounded-xl p-6">
          <h2 className="font-display text-base mb-3">Invoice history</h2>
          <div className="text-sm text-ink-3 py-8 text-center border border-dashed border-ink/15 rounded-lg">
            Invoices will appear here once Stripe is wired up.
          </div>
        </div>
      </div>
    </main>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-ink-3">
          {used} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 bg-cream-2 rounded-pill overflow-hidden">
        <div
          className={`h-full rounded-pill transition-all ${
            pct >= 100 ? 'bg-pink-bright' : 'bg-yellow'
          }`}
          style={{ width: isUnlimited ? '100%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}
