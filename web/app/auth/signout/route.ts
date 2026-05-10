import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST endpoint for signing out. Use a regular form with method="post"
// or fetch('/auth/signout', { method: 'POST' }).
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 302 });
}
