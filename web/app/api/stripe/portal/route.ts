import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';

// POST → { url: string }   (Stripe Customer Portal URL)
//
// TODO(stripe): wire real portal session when keys land. For now responds
// 501 so the dashboard "Manage billing" button fails gracefully.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing not yet enabled.' },
      { status: 501 }
    );
  }

  // TODO(stripe): real implementation
  // const { data: brand } = await supabase.from('brands').select('stripe_customer_id').eq('id', user.id).maybeSingle();
  // if (!brand?.stripe_customer_id) return NextResponse.json({ error: 'No customer record' }, { status: 400 });
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: brand.stripe_customer_id,
  //   return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/brand/billing`
  // });
  // return NextResponse.json({ url: session.url });

  return NextResponse.json(
    { error: 'Customer portal coming soon.' },
    { status: 501 }
  );
}
