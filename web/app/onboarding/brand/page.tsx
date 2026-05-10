import Link from 'next/link';
import { requireUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import ProgressBar from '@/components/ui/ProgressBar';
import ChipSelector from '@/components/ui/ChipSelector';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { BRAND_PLANS } from '@/lib/stripe/config';
import { saveStep1, saveStep2, chooseStep3, finishOnboarding } from './actions';

const STEP_LABELS = ['Company', 'Looking for', 'Plan', 'Done'];

const NICHE_OPTIONS = [
  'beauty','fitness','food','tech','lifestyle','finance','fashion','travel','home','pets','parenting','gaming'
].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

const CONTENT_TYPE_OPTIONS = [
  { value: 'short_video',    label: 'Short video' },
  { value: 'long_video',     label: 'Long video' },
  { value: 'static_image',   label: 'Static image' },
  { value: 'story',          label: 'Story' },
  { value: 'tiktok_live',    label: 'TikTok Live' },
  { value: 'product_demo',   label: 'Product demo' },
  { value: 'testimonial',    label: 'Testimonial' }
];

const INDUSTRY_OPTIONS = [
  'Beauty', 'Fashion', 'Food & Beverage', 'Wellness', 'Tech / SaaS',
  'Home & Lifestyle', 'Personal Care', 'Apparel', 'Other'
];

const BUDGET_OPTIONS = ['$0-1k','$1-5k','$5-25k','$25k+'];

export default async function BrandOnboardingPage({
  searchParams
}: {
  searchParams: { step?: string; error?: string };
}) {
  const user = await requireUser('brand');
  const stepNum = Math.min(4, Math.max(1, Number(searchParams.step) || 1));

  const supabase = createClient();
  const { data: brand } = await supabase
    .from('brands')
    .select('company_name, website, industry, logo_url, bio, preferred_content_types, preferred_niches, budget_range, subscription_status')
    .eq('id', user.id)
    .maybeSingle();
  const b = brand ?? {};

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <ProgressBar current={stepNum} total={4} labels={STEP_LABELS} />
        </div>

        <div className="bg-white border-[2.5px] border-ink rounded-2xl shadow-ink-8 p-8 md:p-10">
          {searchParams.error && (
            <div className="bg-pink-soft border-l-4 border-pink-bright text-ink-2 text-sm rounded px-3 py-2.5 mb-5">
              {searchParams.error}
            </div>
          )}

          {/* ===================== STEP 1 ===================== */}
          {stepNum === 1 && (
            <form action={saveStep1} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step one</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Tell us about your brand.</h2>
                <p className="text-ink-3 text-sm">Creators see this when you reach out.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Company name *</label>
                <input
                  name="company_name"
                  required
                  defaultValue={(b as any).company_name ?? user.fullName ?? ''}
                  placeholder="Bloom & Co."
                  className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Website</label>
                  <input
                    name="website"
                    type="url"
                    defaultValue={(b as any).website ?? ''}
                    placeholder="https://bloomco.com"
                    className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Industry</label>
                  <select
                    name="industry"
                    defaultValue={(b as any).industry ?? ''}
                    className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4"
                  >
                    <option value="">Pick one…</option>
                    {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Logo</label>
                <PhotoUpload
                  userId={user.id}
                  bucket="logos"
                  initialUrl={(b as any).logo_url ?? null}
                  name="logo_url"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={(b as any).bio ?? ''}
                  placeholder="One or two sentences about your brand and the kind of creators you work with."
                  className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 resize-none"
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center">
                Save &amp; continue →
              </button>
            </form>
          )}

          {/* ===================== STEP 2 ===================== */}
          {stepNum === 2 && (
            <form action={saveStep2} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step two</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">What are you looking for?</h2>
                <p className="text-ink-3 text-sm">We'll surface creators that match.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Content types you need</label>
                <ChipSelector
                  name="content_types"
                  options={CONTENT_TYPE_OPTIONS}
                  defaultValue={((b as any).preferred_content_types ?? []) as string[]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Niches you work with</label>
                <ChipSelector
                  name="niches"
                  options={NICHE_OPTIONS}
                  defaultValue={((b as any).preferred_niches ?? []) as string[]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Typical campaign budget</label>
                <div className="grid grid-cols-4 gap-2">
                  {BUDGET_OPTIONS.map(opt => (
                    <label key={opt} className="cursor-pointer">
                      <input
                        type="radio"
                        name="budget_range"
                        value={opt}
                        defaultChecked={(b as any).budget_range === opt}
                        className="peer sr-only"
                      />
                      <div className="border-2 border-ink/20 rounded-lg p-2 text-center text-sm font-display peer-checked:bg-yellow peer-checked:border-ink peer-checked:shadow-ink-2 peer-checked:-translate-x-px peer-checked:-translate-y-px transition-all">
                        {opt}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/brand?step=1" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Save &amp; continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 3 ===================== */}
          {stepNum === 3 && (
            <form action={chooseStep3} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step three</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Pick your plan.</h2>
                <p className="text-ink-3 text-sm">You can change this anytime from billing.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {BRAND_PLANS.map(plan => (
                  <label key={plan.id} className="cursor-pointer relative">
                    {plan.highlighted && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-pink-bright text-white text-[10px] font-display tracking-wider px-2 py-0.5 rounded-pill z-10">
                        MOST POPULAR
                      </span>
                    )}
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      required
                      className="peer sr-only"
                    />
                    <div className={`border-2 rounded-xl p-4 transition-all
                      peer-checked:bg-yellow peer-checked:border-ink peer-checked:shadow-ink-4 peer-checked:-translate-x-px peer-checked:-translate-y-px
                      ${plan.highlighted ? 'border-ink' : 'border-ink/20 hover:border-ink/50'}`}>
                      <div className="font-display text-base">{plan.name}</div>
                      <div className="text-xs text-ink-3 mb-2">{plan.tagline}</div>
                      <div className="font-display text-2xl mb-3">
                        {plan.priceLabel}
                        <span className="text-xs font-normal text-ink-3">{plan.cadenceLabel}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-ink-2">
                        {plan.features.map(f => (
                          <li key={f} className="flex gap-1.5">
                            <span className="text-mint-deep flex-shrink-0">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                ))}
              </div>

              <div className="bg-cream-2 border border-ink/10 rounded-lg px-4 py-3 text-xs text-ink-3">
                <strong className="text-ink-2 font-display text-[11px] tracking-wider uppercase">Heads up</strong>{' '}
                Stripe checkout is being wired up. For now we'll record your plan choice
                and you'll get a reminder to complete payment when checkout is live.
                Full access to brand features stays on for the dev period.
              </div>

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/brand?step=2" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 4 ===================== */}
          {stepNum === 4 && (
            <form action={finishOnboarding} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">all set</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Welcome aboard.</h2>
                <p className="text-ink-3 text-sm">Your account is ready to go.</p>
              </div>

              <div className="bg-cream-2 border-2 border-ink/20 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  {(b as any).logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(b as any).logo_url} alt="" className="w-14 h-14 rounded-lg object-cover border-2 border-ink bg-white" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-pink-bright text-white border-2 border-ink grid place-items-center font-display text-lg">
                      {((b as any).company_name ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-display text-lg leading-tight">{(b as any).company_name ?? '—'}</div>
                    <div className="text-xs text-ink-3">{(b as any).industry ?? ''}</div>
                  </div>
                </div>
                {(b as any).bio && <p className="text-sm text-ink-2">{(b as any).bio}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link href="/dashboard/brand" className="btn-primary justify-center">
                  Find creators →
                </Link>
                <Link href="/dashboard/brand" className="btn-outline justify-center">
                  Post a job
                </Link>
              </div>

              <button type="submit" className="text-xs text-ink-3 hover:text-ink underline mx-auto block">
                Or just go to my dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
