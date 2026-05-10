import { m } from '@/lib/site-config';

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink/10 bg-ink text-cream mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display text-base mb-2">Socio Space Studios</div>
          <p className="text-cream/60 text-xs leading-relaxed">
            The two-sided UGC creator marketplace. Built for creators and brands ready to do real work together.
          </p>
        </div>

        <div>
          <div className="font-display text-xs tracking-wider text-cream/40 mb-3">PRODUCT</div>
          <ul className="space-y-2 text-cream/80">
            <li><a href={m('/features.html')} className="hover:text-yellow">For Creators</a></li>
            <li><a href={m('/brands.html')} className="hover:text-yellow">For Brands</a></li>
            <li><a href={m('/pricing.html')} className="hover:text-yellow">Pricing</a></li>
            <li><a href={m('/demo.html')} className="hover:text-yellow">Demo</a></li>
          </ul>
        </div>

        <div>
          <div className="font-display text-xs tracking-wider text-cream/40 mb-3">GET STARTED</div>
          <ul className="space-y-2 text-cream/80">
            <li><a href="/signup?role=creator" className="hover:text-yellow">Join as a Creator</a></li>
            <li><a href="/signup?role=brand" className="hover:text-yellow">Join as a Brand</a></li>
            <li><a href={m('/creator.html')} className="hover:text-yellow">Sample profile</a></li>
            <li><a href="/login" className="hover:text-yellow">Sign in</a></li>
          </ul>
        </div>

        <div>
          <div className="font-display text-xs tracking-wider text-cream/40 mb-3">COMPANY</div>
          <ul className="space-y-2 text-cream/80">
            <li><a href={m('/contact.html')} className="hover:text-yellow">Contact</a></li>
            <li><a href={m('/contact.html?topic=careers')} className="hover:text-yellow">Careers</a></li>
            <li><a href={m('/contact.html?topic=press')} className="hover:text-yellow">Press</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-cream/50">
          <div>© 2026 Socio Space Studios</div>
          <div className="flex gap-4">
            <a href={m('/')} className="hover:text-cream">Marketing site</a>
            <a href="/login" className="hover:text-cream">Sign in</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
