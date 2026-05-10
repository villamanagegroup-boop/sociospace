import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'creator' | 'brand';

export type AuthedUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
};

/**
 * Get the current authed user with their role. Returns null if not signed in.
 * The role is sourced from auth user_metadata (set during signup).
 */
export async function getUser(): Promise<AuthedUser | null> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.user_metadata || {};
  const role = (meta.role || meta.user_role) as UserRole | undefined;
  if (role !== 'creator' && role !== 'brand') return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role,
    fullName: (meta.full_name as string | undefined) ?? null
  };
}

/**
 * Require an authed user with a specific role. Redirects to /login if missing,
 * or to the correct dashboard if signed in with the wrong role.
 */
export async function requireUser(role: UserRole): Promise<AuthedUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=/dashboard/${role}`);
  if (user.role !== role) redirect(`/dashboard/${user.role}`);
  return user;
}
