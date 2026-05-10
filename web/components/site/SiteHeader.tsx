import Link from 'next/link';
import { m } from '@/lib/site-config';

// Top nav for public Next.js pages (homepage, /jobs, /creators, etc.).
// Links back to the marketing site for content pages (about, pricing, contact).

type Props = {
  signedIn?: boolean;
  role?: 'creator' | 'brand';
};

export default function SiteHeader({ signedIn, role }: Props) {
  return (
    <header className="border-b-2 border-ink/10 bg-cream sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <Link href="/" className="font-display text-base leading-none">
          Socio Space
          <span className="block text-[10px] tracking-widest text-ink-3 mt-0.5">STUDIOS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm flex-1">
          <a href={m('/features.html')} className="hover:text-pink-bright">For Creators</a>
          <a href={m('/brands.html')} className="hover:text-pink-bright">For Brands</a>
          <a href={m('/pricing.html')} className="hover:text-pink-bright">Pricing</a>
          <a href={m('/contact.html')} className="hover:text-pink-bright">Contact</a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {signedIn && role ? (
            <Link href={`/dashboard/${role}`} className="btn-primary text-xs px-4 py-2">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-pink-bright">Sign in</Link>
              <Link href="/signup" className="btn-primary text-xs px-4 py-2">Sign up →</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
