import Link from 'next/link';
import { signup } from '../actions';

export default function SignupPage({
  searchParams
}: {
  searchParams: { error?: string; role?: 'creator' | 'brand'; next?: string };
}) {
  const defaultRole = searchParams.role;

  return (
    <div className="bg-white border-[2.5px] border-ink rounded-2xl shadow-ink-8 p-8 md:p-10">
      <span className="font-script text-pink-bright text-xl -rotate-3 inline-block mb-1">
        let's go
      </span>
      <h1 className="font-display text-3xl md:text-4xl mb-1 leading-tight">Create your account</h1>
      <p className="text-ink-3 text-sm mb-7">
        Two quick fields, pick your side, then we'll set up your profile.
      </p>

      <form action={signup} className="space-y-4">
        {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}

        {/* Role selector — radio buttons styled as cards */}
        <div>
          <label className="block text-sm font-semibold mb-2">I'm signing up as a…</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="role-option cursor-pointer">
              <input
                type="radio"
                name="role"
                value="creator"
                required
                defaultChecked={defaultRole === 'creator'}
                className="peer sr-only"
              />
              <div className="border-2 border-ink rounded-xl p-4 text-center peer-checked:bg-yellow peer-checked:shadow-ink-4 peer-checked:-translate-x-0.5 peer-checked:-translate-y-0.5 transition-all">
                <div className="text-2xl mb-1">🎤</div>
                <div className="font-display text-base">Creator</div>
                <div className="text-xs text-ink-3 mt-0.5">Get on the roster, land deals</div>
              </div>
            </label>

            <label className="role-option cursor-pointer">
              <input
                type="radio"
                name="role"
                value="brand"
                required
                defaultChecked={defaultRole === 'brand'}
                className="peer sr-only"
              />
              <div className="border-2 border-ink rounded-xl p-4 text-center peer-checked:bg-pink-bright peer-checked:text-white peer-checked:shadow-ink-4 peer-checked:-translate-x-0.5 peer-checked:-translate-y-0.5 transition-all">
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-display text-base">Brand</div>
                <div className="text-xs opacity-80 mt-0.5">Hire creators, run campaigns</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-semibold mb-1.5">
            Full name (or company name)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            placeholder="Maya Chen"
            className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@studio.com"
            className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 transition-shadow"
          />
        </div>

        {searchParams.error && (
          <div className="bg-pink-soft border-l-4 border-pink-bright text-ink-2 text-sm rounded px-3 py-2.5">
            {searchParams.error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full justify-center">
          Create account →
        </button>

        <p className="text-xs text-ink-4 text-center">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="text-center text-sm text-ink-3 mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-ink underline underline-offset-2 font-semibold hover:text-pink-bright"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
