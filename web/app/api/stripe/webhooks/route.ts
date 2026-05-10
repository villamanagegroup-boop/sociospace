import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';

// Stripe sends raw POST events here. We verify the signature, then dispatch
// by event type to keep `creators.subscription_status` and `brands.subscription_status`
// in sync with Stripe.
//
// TODO(stripe): implement signature verification + event handlers when keys land.
// Events to handle (from spec):
//   - customer.subscription.created
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - invoice.payment_succeeded
//   - invoice.payment_failed
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    // No keys configured — return 200 so Stripe doesn't retry forever during dev.
    return new NextResponse('Stripe not configured', { status: 200 });
  }

  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new NextResponse('Missing signature', { status: 400 });
  }

  // TODO(stripe): real implementation
  // const rawBody = await request.text();
  // let event;
  // try {
  //   event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  // } catch (err) {
  //   return new NextResponse(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  // }
  //
  // const supabase = createServiceRoleClient(); // service-role bypasses RLS for sub status updates
  // switch (event.type) {
  //   case 'customer.subscription.created':
  //   case 'customer.subscription.updated':
  //     await syncSubscriptionStatus(supabase, event.data.object);
  //     break;
  //   case 'customer.subscription.deleted':
  //     await markSubscriptionCanceled(supabase, event.data.object);
  //     break;
  //   case 'invoice.payment_succeeded':
  //     // optional: send Resend confirmation email
  //     break;
  //   case 'invoice.payment_failed':
  //     await markPastDue(supabase, event.data.object);
  //     break;
  // }

  return NextResponse.json({ received: true });
}
