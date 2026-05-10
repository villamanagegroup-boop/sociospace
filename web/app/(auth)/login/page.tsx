import Link from 'next/link';
import { login } from '../actions';

export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div className="bg-white border-[2.5px] border-ink rounded-2xl shadow-ink-8 p-8 md:p-10">
      <span className="font-script text-pink-bright text-xl -rotate-3 inline-block mb-1">
        welcome back
      </span>
      <h1 className="font-display text-3xl md:text-4xl mb-1 leading-tight">Sign in</h1>
      <p className="text-ink-3 text-sm mb-7">
        Enter your email and password to get back into your studio.
      </p>

      <form action={login} className="space-y-4">
        {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}

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
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full border-2 border-ink rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:shadow-ink-4 transition-shadow"
          />
        </div>

        {searchParams.error && (
          <div className="bg-pink-soft border-l-4 border-pink-bright text-ink-2 text-sm rounded px-3 py-2.5">
            {searchParams.error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full justify-center">
          Sign in →
        </button>
      </form>

      <p className="text-center text-sm text-ink-3 mt-6">
        New here?{' '}
        <Link
          href="/signup"
          className="text-ink underline underline-offset-2 font-semibold hover:text-pink-bright"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
