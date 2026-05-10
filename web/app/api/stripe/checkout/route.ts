import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlan, type PlanTier } from '@/lib/stripe/config';
import { getStripe } from '@/lib/stripe/server';

// POST { plan: PlanTier } → { url: string }   (Stripe Checkout URL)
//
// TODO(stripe): wire actual checkout session creation when keys land.
// For now this responds 501 (Not Implemented) with a clear message so the
// brand onboarding "Choose plan" UI fails gracefully instead of crashing.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let plan: PlanTier | undefined;
  try {
    const body = await request.json();
    plan = body?.plan;
  } catch {}

  if (!plan || !getPlan(plan)) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing not yet enabled. Plan recorded — check back soon.' },
      { status: 501 }
    );
  }

  // TODO(stripe): real implementation
  // const priceId = process.env[getPlan(plan)!.envPriceId];
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'subscription',
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/${audience}?subscribed=1`,
  //   cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding/${audience}?step=3`,
  //   client_reference_id: user.id,
  //   customer_email: user.email,
  //   metadata: { user_id: user.id, plan }
  // });
  // return NextResponse.json({ url: session.url });

  return NextResponse.json(
    { error: 'Stripe checkout coming soon. We\'ve recorded your selection.' },
    { status: 501 }
  );
}
