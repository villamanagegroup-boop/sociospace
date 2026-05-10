import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the email-confirmation callback when email confirmation is enabled
// in Supabase. The link Supabase emails contains a `code` query param. We
// exchange it for a session, ensure the user has a creators/brands profile
// row (since signup couldn't insert it without a session), then redirect to
// the appropriate onboarding flow.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing+code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Auth failed')}`);
  }

  const meta = data.user.user_metadata || {};
  const role = (meta.role || meta.user_role) as 'creator' | 'brand' | undefined;
  const fullName = meta.full_name as string | undefined;

  // Backfill the profile row if it doesn't exist yet (signup deferred this
  // when no session was returned).
  if (role === 'creator') {
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from('creators').insert({ id: data.user.id, full_name: fullName ?? null });
    }
  } else if (role === 'brand') {
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from('brands').insert({ id: data.user.id, company_name: fullName ?? null });
    }
  }

  const redirectTo = role
    ? `${origin}/onboarding/${role}`
    : `${origin}${next}`;
  return NextResponse.redirect(redirectTo);
}
