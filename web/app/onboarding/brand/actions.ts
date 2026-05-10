'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BRAND_PLANS, type PlanTier } from '@/lib/stripe/config';

const NICHES = [
  'beauty','fitness','food','tech','lifestyle','finance','fashion','travel','home','pets','parenting','gaming'
];
const CONTENT_TYPES = ['short_video','long_video','static_image','story','tiktok_live','product_demo','testimonial'];
const BUDGET_RANGES = ['$0-1k','$1-5k','$5-25k','$25k+'];

function bad(step: number, message: string) {
  redirect(`/onboarding/brand?step=${step}&error=${encodeURIComponent(message)}`);
}

function csv(value: FormDataEntryValue | null) {
  return String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

async function getOwnedBrand() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/onboarding/brand');
  const { data: brand } = await supabase.from('brands').select('id').eq('id', user.id).maybeSingle();
  if (!brand) {
    await supabase.from('brands').insert({ id: user.id });
  }
  return { supabase, userId: user.id };
}

// ---------------- Step 1 ----------------
export async function saveStep1(formData: FormData) {
  const { supabase, userId } = await getOwnedBrand();

  const company_name = String(formData.get('company_name') || '').trim();
  const website      = String(formData.get('website')      || '').trim() || null;
  const industry     = String(formData.get('industry')     || '').trim() || null;
  const logo_url     = String(formData.get('logo_url')     || '').trim() || null;
  const bio          = String(formData.get('bio')          || '').trim() || null;

  if (!company_name) bad(1, 'Company name is required.');

  const { error } = await supabase.from('brands').update({
    company_name, website, industry, logo_url, bio
  }).eq('id', userId);
  if (error) bad(1, error.message);

  revalidatePath('/onboarding/brand');
  redirect('/onboarding/brand?step=2');
}

// ---------------- Step 2 ----------------
export async function saveStep2(formData: FormData) {
  const { supabase, userId } = await getOwnedBrand();

  const preferred_content_types = csv(formData.get('content_types')).filter(v => CONTENT_TYPES.includes(v));
  const preferred_niches        = csv(formData.get('niches')).filter(v => NICHES.includes(v));
  const budget_range            = String(formData.get('budget_range') || '').trim();

  if (preferred_content_types.length === 0) bad(2, 'Pick at least one content type.');
  if (preferred_niches.length === 0)        bad(2, 'Pick at least one niche.');
  if (!BUDGET_RANGES.includes(budget_range)) bad(2, 'Pick a budget range.');

  const { error } = await supabase.from('brands').update({
    preferred_content_types, preferred_niches, budget_range
  }).eq('id', userId);
  if (error) bad(2, error.message);

  revalidatePath('/onboarding/brand');
  redirect('/onboarding/brand?step=3');
}

// ---------------- Step 3 ----------------
// Records the chosen plan locally, then (when Stripe is wired) hits Checkout.
// For now we just record the selection and proceed to step 4.
export async function chooseStep3(formData: FormData) {
  const { supabase, userId } = await getOwnedBrand();

  const plan = String(formData.get('plan') || '') as PlanTier;
  const valid = BRAND_PLANS.find(p => p.id === plan);
  if (!valid) bad(3, 'Pick a plan.');

  // Free tier activates immediately. Paid tiers stay '_pending' until
  // Stripe checkout completes (currently stubbed — see /api/stripe/checkout).
  const status = valid!.isFree ? plan : `${plan}_pending`;

  const { error } = await supabase.from('brands').update({
    subscription_status: status
  }).eq('id', userId);
  if (error) bad(3, error.message);

  revalidatePath('/onboarding/brand');
  redirect('/onboarding/brand?step=4');
}

// ---------------- Finish ----------------
export async function finishOnboarding() {
  redirect('/dashboard/brand');
}
