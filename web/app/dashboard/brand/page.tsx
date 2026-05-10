import { requireUser } from '@/lib/auth/get-user';

export default async function BrandDashboardPage() {
  const user = await requireUser('brand');

  return (
    <main className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto">
        <div>
          <span className="font-script text-pink-bright text-xl -rotate-2 inline-block mb-1">
            hey {user.fullName ?? 'brand'}
          </span>
          <h1 className="font-display text-3xl">Brand dashboard</h1>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-outline">Sign out</button>
        </form>
      </header>

      <div className="max-w-5xl mx-auto bg-white border-2 border-ink rounded-xl p-8">
        <h2 className="font-display text-xl mb-2">Coming soon</h2>
        <p className="text-ink-3">
          Overview, find creators, saved creators, post a job, my jobs, applications,
          campaigns, billing, notifications. Building these out next.
        </p>
        <p className="text-ink-4 text-sm mt-4">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
      </div>
    </main>
  );
}
