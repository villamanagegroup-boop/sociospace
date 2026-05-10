'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type AuthRole = 'creator' | 'brand';

function backWithError(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ============================================================
// Sign up — creates auth.users row + creators/brands profile row
// ============================================================
export async function signup(formData: FormData) {
  const fullName = String(formData.get('full_name') || '').trim();
  const email    = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const role     = String(formData.get('role') || '') as AuthRole;
  const next     = String(formData.get('next') || '');

  if (!fullName || !email || !password)
    return backWithError('/signup', 'Fill out every field.');
  if (password.length < 8)
    return backWithError('/signup', 'Password must be at least 8 characters.');
  if (role !== 'creator' && role !== 'brand')
    return backWithError('/signup', 'Pick whether you\'re a creator or a brand.');

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined
    }
  });

  if (error) return backWithError('/signup', error.message);
  if (!data.user) return backWithError('/signup', 'Could not create account. Try again.');

  // If email confirmation is OFF (current dev setting), a session exists
  // immediately and we can insert the profile row as the new user.
  // If confirmation is ON, no session yet — profile row is created
  // later in /auth/callback after the user clicks the email link.
  if (data.session) {
    const profileRes = role === 'creator'
      ? await supabase.from('creators').insert({ id: data.user.id, full_name: fullName })
      : await supabase.from('brands').insert({ id: data.user.id, company_name: fullName });

    if (profileRes.error) {
      console.error('[signup] profile insert failed:', profileRes.error);
      // Continue — the user can complete profile during onboarding.
    }
  } else {
    // Email confirmation flow — show the user a "check your email" page
    redirect('/signup/check-email');
  }

  revalidatePath('/', 'layout');
  redirect(next || `/onboarding/${role}`);
}

// ============================================================
// Log in — verifies password and routes to the correct dashboard
// ============================================================
export async function login(formData: FormData) {
  const email    = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next     = String(formData.get('next') || '');

  if (!email || !password)
    return backWithError('/login', 'Email and password are required.');

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return backWithError('/login', error.message);
  if (!data.user) return backWithError('/login', 'Sign in failed.');

  const role = (data.user.user_metadata?.role || data.user.user_metadata?.user_role) as AuthRole | undefined;
  if (role !== 'creator' && role !== 'brand') {
    return backWithError('/login', "We can't find your account role. Contact support.");
  }

  revalidatePath('/', 'layout');
  redirect(next || `/dashboard/${role}`);
}

// ============================================================
// Sign out — clears the session and returns to the homepage
// ============================================================
export async function signout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
