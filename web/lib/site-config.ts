// Cross-app URL helpers. Marketing static pages and Next.js routes now share
// the same Next.js dev server on port 3000 — public/*.html is served at
// /<file>.html, and Next.js routes own /login, /signup, /dashboard, etc.
//
// `m()` exists so SiteHeader/SiteFooter components stay readable and so we
// can swap in an external marketing domain in the future if we ever split
// the deploys again.

export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? '';

export function m(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return `${MARKETING_URL}${path}`;
}
