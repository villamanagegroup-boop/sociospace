import Link from 'next/link';

export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative scrapbook background */}
      <span className="absolute top-[12%] left-[10%] text-pink-bright text-2xl rotate-[-15deg] select-none pointer-events-none">✦</span>
      <span className="absolute top-[18%] right-[14%] text-mint-deep text-xl rotate-[20deg] select-none pointer-events-none">★</span>
      <span className="absolute bottom-[16%] left-[18%] text-yellow-deep text-xl rotate-[8deg] select-none pointer-events-none">✦</span>
      <span className="absolute bottom-[24%] right-[12%] text-ink text-base rotate-[-22deg] select-none pointer-events-none">★</span>

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-ink-3 text-sm mb-8 hover:text-ink transition-colors"
        >
          ← Back to home
        </Link>
        {children}
      </div>
    </main>
  );
}
