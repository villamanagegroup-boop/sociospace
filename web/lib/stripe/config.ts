// Plan definitions — kept here so UI (pricing page, onboarding plan picker,
// billing dashboard) and server (Stripe checkout / webhooks) agree on the
// same identifiers and feature lists. Actual price IDs live in env vars;
// products themselves are configured in the Stripe dashboard.

export type PlanTier =
  | 'brand_free'   | 'brand_pro'   | 'brand_pro_plus'
  | 'creator_free' | 'creator_pro' | 'creator_pro_plus';

export type Plan = {
  id: PlanTier;
  name: string;
  audience: 'brand' | 'creator';
  priceCents: number;
  priceLabel: string;       // '$0' | '$99' | etc.
  cadenceLabel: string;     // '/month' | '/forever'
  tagline: string;
  features: string[];
  comingSoon?: string[];
  highlighted?: boolean;
  isFree?: boolean;
  envPriceId?: string;      // env var name holding the Stripe price ID
};

// ============================================================
// Brand plans — marketplace model
//
// Free   = browse only; profile handles + DMs hidden until upgrade
// Pro    = pay to contact (limited unlocks + job posts)
// Pro+   = unlimited everything for ongoing campaigns
// ============================================================
export const BRAND_PLANS: Plan[] = [
  {
    id: 'brand_free',
    name: 'Free',
    audience: 'brand',
    priceCents: 0,
    priceLabel: '$0',
    cadenceLabel: '/forever',
    tagline: 'Browse the marketplace.',
    features: [
      'Browse the full creator roster',
      'See niches, rates, and portfolio samples',
      'Save creators to a private list',
      'Handles + contact info hidden'
    ],
    isFree: true
  },
  {
    id: 'brand_pro',
    name: 'Pro',
    audience: 'brand',
    priceCents: 9900,
    priceLabel: '$99',
    cadenceLabel: '/month',
    tagline: 'Reach the creators you want.',
    features: [
      'Everything in Free',
      '10 contact unlocks per month',
      '3 job posts per month',
      'Direct messages with creators',
      'Application management'
    ],
    highlighted: true,
    envPriceId: 'NEXT_PUBLIC_STRIPE_PRICE_BRAND_PRO'
  },
  {
    id: 'brand_pro_plus',
    name: 'Pro+',
    audience: 'brand',
    priceCents: 19900,
    priceLabel: '$199',
    cadenceLabel: '/month',
    tagline: 'Run ongoing campaigns.',
    features: [
      'Everything in Pro',
      'Unlimited contact unlocks',
      'Unlimited job posts',
      'Advanced search + saved filters',
      'Priority placement to creators'
    ],
    comingSoon: [
      '3 team seats',
      'Campaign analytics'
    ],
    envPriceId: 'NEXT_PUBLIC_STRIPE_PRICE_BRAND_PROPLUS'
  }
];

// ============================================================
// Creator plans — supply side, free to join
// ============================================================
export const CREATOR_PLANS: Plan[] = [
  {
    id: 'creator_free',
    name: 'Free',
    audience: 'creator',
    priceCents: 0,
    priceLabel: '$0',
    cadenceLabel: '/forever',
    tagline: 'Get on the roster.',
    features: [
      'Public creator profile',
      'Direct messages from brands',
      'Apply to open jobs',
      '3 active deals tracked'
    ],
    isFree: true
  },
  {
    id: 'creator_pro',
    name: 'Creator Pro',
    audience: 'creator',
    priceCents: 2900,
    priceLabel: '$29',
    cadenceLabel: '/month',
    tagline: 'Run the whole business.',
    features: [
      'Everything in Free',
      'Unlimited deal tracking',
      'Pitch log + saved templates',
      'Invoice generator',
      'Earnings dashboard',
      'Profile analytics'
    ],
    highlighted: true,
    envPriceId: 'NEXT_PUBLIC_STRIPE_PRICE_CREATOR_PRO'
  },
  {
    id: 'creator_pro_plus',
    name: 'Creator Pro+',
    audience: 'creator',
    priceCents: 4900,
    priceLabel: '$49',
    cadenceLabel: '/month',
    tagline: 'Scale your studio.',
    features: [
      'Everything in Creator Pro',
      'Priority profile placement',
      'Verified creator badge'
    ],
    comingSoon: [
      'Media kit builder',
      'Rate benchmarking'
    ],
    envPriceId: 'NEXT_PUBLIC_STRIPE_PRICE_CREATOR_PROPLUS'
  }
];

export const ALL_PLANS = [...BRAND_PLANS, ...CREATOR_PLANS];

export function getPlan(id: PlanTier): Plan | undefined {
  return ALL_PLANS.find(p => p.id === id);
}
