// Server-only Stripe client. Wire real API calls in a follow-up turn.
// For now this module exposes a lazy initializer so the rest of the
// codebase can import it without throwing when keys aren't set yet.

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_$') || key === 'sk_test_') {
    // Not configured yet — callers should handle null and respond with a
    // friendly "billing not yet enabled" message.
    return null;
  }
  _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  return _stripe;
}

// TODO(stripe): wire real Checkout session creation here.
// export async function createCheckoutSession(opts: { priceId: string; customerId?: string; userId: string; successUrl: string; cancelUrl: string }) { ... }

// TODO(stripe): wire real Customer Portal session here.
// export async function createPortalSession(opts: { customerId: string; returnUrl: string }) { ... }

// TODO(stripe): verify webhook signatures and dispatch by event type.
// export async function handleWebhookEvent(rawBody: string, signature: string) { ... }
