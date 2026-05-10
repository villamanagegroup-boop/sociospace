import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import ProgressBar from '@/components/ui/ProgressBar';
import ChipSelector from '@/components/ui/ChipSelector';
import PhotoUpload from '@/components/ui/PhotoUpload';
import PortfolioUpload from '@/components/ui/PortfolioUpload';
import ExtraRatesField from '@/components/ui/ExtraRatesField';
import {
  saveStep1, saveStep2, saveStep3, saveStep4, saveStep5, finishOnboarding
} from './actions';

const STEP_LABELS = ['Basics', 'Profile', 'Rates', 'Portfolio', 'Availability', 'Done'];

const NICHE_OPTIONS = [
  { value: 'beauty',     label: 'Beauty' },
  { value: 'fitness',    label: 'Fitness' },
  { value: 'food',       label: 'Food' },
  { value: 'tech',       label: 'Tech' },
  { value: 'lifestyle',  label: 'Lifestyle' },
  { value: 'finance',    label: 'Finance' },
  { value: 'fashion',    label: 'Fashion' },
  { value: 'travel',     label: 'Travel' },
  { value: 'home',       label: 'Home' },
  { value: 'pets',       label: 'Pets' },
  { value: 'parenting',  label: 'Parenting' },
  { value: 'gaming',     label: 'Gaming' }
];

const PLATFORM_OPTIONS = [
  { value: 'tiktok',     label: 'TikTok' },
  { value: 'instagram',  label: 'Instagram' },
  { value: 'youtube',    label: 'YouTube' },
  { value: 'ugc_only',   label: 'UGC Only' }
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'short_video',    label: 'Short video' },
  { value: 'long_video',     label: 'Long video' },
  { value: 'static_image',   label: 'Static image' },
  { value: 'story',          label: 'Story' },
  { value: 'tiktok_live',    label: 'TikTok Live' },
  { value: 'product_demo',   label: 'Product demo' },
  { value: 'testimonial',    label: 'Testimonial' }
];

type SearchParams = { step?: string; error?: string };

export default async function CreatorOnboardingPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser('creator');
  const stepNum = Math.min(6, Math.max(1, Number(searchParams.step) || 1));

  // Pull current state so each step can pre-fill saved values
  const supabase = createClient();
  const { data: creator } = await supabase
    .from('creators')
    .select('full_name, location, bio, profile_photo_url, niche_tags, platforms, content_types, portfolio_urls, availability, availability_note, visibility')
    .eq('id', user.id)
    .maybeSingle();

  const { data: rates } = await supabase
    .from('creator_rates')
    .select('content_type, rate_cents, description')
    .eq('creator_id', user.id)
    .order('sort_order', { ascending: true });

  const c = creator ?? {};

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <ProgressBar current={stepNum} total={6} labels={STEP_LABELS} />
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
                <h2 className="font-display text-3xl mb-1 leading-tight">Basics first.</h2>
                <p className="text-ink-3 text-sm">Tell brands who they're working with.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Full name *</label>
                <input
                  name="full_name"
                  required
                  defaultValue={(c as any).full_name ?? user.fullName ?? ''}
                  placeholder="Maya Chen"
                  className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Profile photo</label>
                <PhotoUpload
                  userId={user.id}
                  bucket="avatars"
                  initialUrl={(c as any).profile_photo_url ?? null}
                  name="profile_photo_url"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Location</label>
                <input
                  name="location"
                  defaultValue={(c as any).location ?? ''}
                  placeholder="Brooklyn, NY"
                  className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Bio <span className="text-ink-4 font-normal text-xs">— 250 characters max</span>
                </label>
                <textarea
                  name="bio"
                  maxLength={250}
                  rows={3}
                  defaultValue={(c as any).bio ?? ''}
                  placeholder="One or two sentences about your style and what you do best."
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
                <h2 className="font-display text-3xl mb-1 leading-tight">What do you make?</h2>
                <p className="text-ink-3 text-sm">Pick all that apply — brands filter by these.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Niches</label>
                <ChipSelector
                  name="niche_tags"
                  options={NICHE_OPTIONS}
                  defaultValue={((c as any).niche_tags ?? []) as string[]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Platforms</label>
                <ChipSelector
                  name="platforms"
                  options={PLATFORM_OPTIONS}
                  defaultValue={((c as any).platforms ?? []) as string[]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Content types</label>
                <ChipSelector
                  name="content_types"
                  options={CONTENT_TYPE_OPTIONS}
                  defaultValue={((c as any).content_types ?? []) as string[]}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/creator?step=1" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Save &amp; continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 3 ===================== */}
          {stepNum === 3 && (
            <form action={saveStep3} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step three</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Set your rates.</h2>
                <p className="text-ink-3 text-sm">
                  Rates are visible to brands on your profile. You can update them anytime.
                </p>
              </div>

              {((c as any).content_types ?? []).length === 0 ? (
                <p className="text-ink-3 text-sm bg-cream-2 border border-ink/20 rounded p-3">
                  Pick content types in step 2 first — your rate card is built from those.
                </p>
              ) : (
                <div className="space-y-3">
                  {((c as any).content_types as string[]).map((ct) => {
                    const existing = (rates ?? []).find(r => r.content_type === ct);
                    const dollars = existing ? Math.round((existing.rate_cents ?? 0) / 100) : '';
                    const label = CONTENT_TYPE_OPTIONS.find(o => o.value === ct)?.label ?? ct;
                    return (
                      <div key={ct} className="grid grid-cols-[1fr_140px] gap-3 items-center">
                        <span className="font-semibold text-sm">{label}</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            name={`rate__${ct}`}
                            defaultValue={dollars as any}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 border-2 border-ink/20 rounded-lg focus:border-ink text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Custom rate items</label>
                <ExtraRatesField />
              </div>

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/creator?step=2" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Save &amp; continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 4 ===================== */}
          {stepNum === 4 && (
            <form action={saveStep4} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step four</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Show your work.</h2>
                <p className="text-ink-3 text-sm">Up to 12 portfolio items — images or videos.</p>
              </div>

              <PortfolioUpload
                userId={user.id}
                initial={((c as any).portfolio_urls ?? []) as string[]}
                contentTypes={((c as any).content_types ?? []) as string[]}
                name="portfolio_urls"
                max={12}
              />

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/creator?step=3" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Save &amp; continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 5 ===================== */}
          {stepNum === 5 && (
            <form action={saveStep5} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">step five</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">Are you taking work?</h2>
                <p className="text-ink-3 text-sm">You can change this anytime from your profile.</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'open',         label: 'Open to work',  hint: 'Show me to brands' },
                  { v: 'selective',    label: 'Selective',     hint: 'Just the right fit' },
                  { v: 'unavailable',  label: 'Not available', hint: 'Hidden from search' }
                ].map(opt => (
                  <label key={opt.v} className="cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      value={opt.v}
                      defaultChecked={((c as any).availability ?? 'open') === opt.v}
                      className="peer sr-only"
                    />
                    <div className="border-2 border-ink/20 rounded-xl p-3 text-center peer-checked:bg-yellow peer-checked:border-ink peer-checked:shadow-ink-4 peer-checked:-translate-x-px peer-checked:-translate-y-px transition-all">
                      <div className="font-display text-sm">{opt.label}</div>
                      <div className="text-[11px] text-ink-3 mt-0.5">{opt.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Capacity note <span className="text-ink-4 font-normal text-xs">— optional</span>
                </label>
                <textarea
                  name="availability_note"
                  rows={2}
                  defaultValue={(c as any).availability_note ?? ''}
                  placeholder="Booking 4 deliverables/month right now. Tight on June, open July+."
                  className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-sm bg-white outline-none focus:shadow-ink-4 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Link href="/onboarding/creator?step=4" className="btn-outline">← Back</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Save &amp; continue →</button>
              </div>
            </form>
          )}

          {/* ===================== STEP 6 ===================== */}
          {stepNum === 6 && (
            <form action={finishOnboarding} className="space-y-5">
              <div>
                <span className="font-script text-pink-bright text-xl -rotate-3 inline-block">all set</span>
                <h2 className="font-display text-3xl mb-1 leading-tight">You're live.</h2>
                <p className="text-ink-3 text-sm">Here's how brands will see you.</p>
              </div>

              <div className="bg-cream-2 border-2 border-ink/20 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  {(c as any).profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(c as any).profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-ink" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-yellow border-2 border-ink grid place-items-center font-display">
                      {((c as any).full_name ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-display text-lg leading-tight">{(c as any).full_name ?? '—'}</div>
                    <div className="text-xs text-ink-3">{(c as any).location ?? ''}</div>
                  </div>
                </div>
                {(c as any).bio && <p className="text-sm text-ink-2 mb-3">{(c as any).bio}</p>}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {((c as any).niche_tags ?? []).map((n: string) => (
                    <span key={n} className="bg-pink-soft text-ink-2 text-xs font-semibold px-2 py-0.5 rounded-pill">{n}</span>
                  ))}
                  {((c as any).platforms ?? []).map((p: string) => (
                    <span key={p} className="bg-mint-soft text-ink-2 text-xs font-semibold px-2 py-0.5 rounded-pill">{p}</span>
                  ))}
                </div>
                {((rates ?? []).length > 0) && (
                  <div className="text-xs text-ink-3">
                    <span className="font-semibold text-ink-2">Starts at</span>{' '}
                    ${Math.min(...(rates ?? []).map(r => r.rate_cents)) / 100}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Link href={`/creators/${user.id}`} className="btn-outline">View public profile</Link>
                <button type="submit" className="btn-primary flex-1 justify-center">Go to dashboard →</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
