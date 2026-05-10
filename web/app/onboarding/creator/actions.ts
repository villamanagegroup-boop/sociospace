'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const NICHES = [
  'beauty','fitness','food','tech','lifestyle','finance','fashion','travel','home','pets','parenting','gaming'
];
const PLATFORMS = ['tiktok','instagram','youtube','ugc_only'];
const CONTENT_TYPES = ['short_video','long_video','static_image','story','tiktok_live','product_demo','testimonial'];

function bad(step: number, message: string) {
  redirect(`/onboarding/creator?step=${step}&error=${encodeURIComponent(message)}`);
}

function csv(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function getOwnedCreator() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/onboarding/creator');
  const { data: creator } = await supabase.from('creators').select('id').eq('id', user.id).maybeSingle();
  if (!creator) {
    // Backfill if signup somehow skipped it
    await supabase.from('creators').insert({ id: user.id });
  }
  return { supabase, userId: user.id };
}

// ---------------- Step 1 ----------------
export async function saveStep1(formData: FormData) {
  const { supabase, userId } = await getOwnedCreator();

  const full_name = String(formData.get('full_name') || '').trim();
  const location  = String(formData.get('location')  || '').trim() || null;
  const bio       = String(formData.get('bio')       || '').trim().slice(0, 250) || null;
  const profile_photo_url = String(formData.get('profile_photo_url') || '').trim() || null;

  if (!full_name) bad(1, 'Your name is required.');

  const { error } = await supabase.from('creators').update({
    full_name, location, bio, profile_photo_url
  }).eq('id', userId);
  if (error) bad(1, error.message);

  revalidatePath('/onboarding/creator');
  redirect('/onboarding/creator?step=2');
}

// ---------------- Step 2 ----------------
export async function saveStep2(formData: FormData) {
  const { supabase, userId } = await getOwnedCreator();

  const niche_tags     = csv(formData.get('niche_tags')).filter(v => NICHES.includes(v));
  const platforms      = csv(formData.get('platforms')).filter(v => PLATFORMS.includes(v));
  const content_types  = csv(formData.get('content_types')).filter(v => CONTENT_TYPES.includes(v));

  if (niche_tags.length === 0)    bad(2, 'Pick at least one niche.');
  if (platforms.length === 0)     bad(2, 'Pick at least one platform.');
  if (content_types.length === 0) bad(2, 'Pick at least one content type.');

  const { error } = await supabase.from('creators').update({
    niche_tags, platforms, content_types
  }).eq('id', userId);
  if (error) bad(2, error.message);

  revalidatePath('/onboarding/creator');
  redirect('/onboarding/creator?step=3');
}

// ---------------- Step 3 ----------------
export async function saveStep3(formData: FormData) {
  const { supabase, userId } = await getOwnedCreator();

  // Wipe existing rates (treat this step as the source of truth) and reinsert
  const { error: delErr } = await supabase.from('creator_rates').delete().eq('creator_id', userId);
  if (delErr) bad(3, delErr.message);

  // Form fields are: rate__<content_type>=<dollars>, plus extras as
  // extra_type[i] / extra_rate[i] / extra_desc[i]
  const inserts: Array<{ creator_id: string; content_type: string; rate_cents: number; description: string | null; sort_order: number }> = [];

  let order = 0;
  for (const ct of CONTENT_TYPES) {
    const raw = formData.get(`rate__${ct}`);
    if (raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    inserts.push({
      creator_id: userId,
      content_type: ct,
      rate_cents: Math.round(n * 100),
      description: null,
      sort_order: order++
    });
  }

  // Custom rate rows
  const extraTypes = formData.getAll('extra_type[]').map(v => String(v).trim());
  const extraRates = formData.getAll('extra_rate[]').map(v => Number(v));
  const extraDescs = formData.getAll('extra_desc[]').map(v => String(v).trim());
  for (let i = 0; i < extraTypes.length; i++) {
    if (!extraTypes[i] || !Number.isFinite(extraRates[i]) || extraRates[i] <= 0) continue;
    inserts.push({
      creator_id: userId,
      content_type: extraTypes[i],
      rate_cents: Math.round(extraRates[i] * 100),
      description: extraDescs[i] || null,
      sort_order: order++
    });
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from('creator_rates').insert(inserts);
    if (insErr) bad(3, insErr.message);
  }

  revalidatePath('/onboarding/creator');
  redirect('/onboarding/creator?step=4');
}

// ---------------- Step 4 ----------------
export async function saveStep4(formData: FormData) {
  const { supabase, userId } = await getOwnedCreator();

  let portfolio_urls: string[] = [];
  try {
    const raw = formData.get('portfolio_urls');
    portfolio_urls = JSON.parse(String(raw ?? '[]'));
    if (!Array.isArray(portfolio_urls)) portfolio_urls = [];
    portfolio_urls = portfolio_urls.filter(u => typeof u === 'string' && u.startsWith('http'));
  } catch {
    portfolio_urls = [];
  }

  const { error } = await supabase.from('creators').update({ portfolio_urls }).eq('id', userId);
  if (error) bad(4, error.message);

  revalidatePath('/onboarding/creator');
  redirect('/onboarding/creator?step=5');
}

// ---------------- Step 5 ----------------
export async function saveStep5(formData: FormData) {
  const { supabase, userId } = await getOwnedCreator();

  const availability = String(formData.get('availability') || 'open');
  const availability_note = String(formData.get('availability_note') || '').trim() || null;
  if (!['open','selective','unavailable'].includes(availability)) bad(5, 'Invalid availability.');

  const { error } = await supabase.from('creators').update({
    availability, availability_note
  }).eq('id', userId);
  if (error) bad(5, error.message);

  revalidatePath('/onboarding/creator');
  redirect('/onboarding/creator?step=6');
}

// ---------------- Finish ----------------
export async function finishOnboarding() {
  redirect('/dashboard/creator');
}
