'use client';

import { useState } from 'react';

type Props = {
  children?: React.ReactNode;
  className?: string;
};

// POSTs to /api/stripe/portal and either redirects to Stripe's Customer
// Portal or surfaces the "billing not yet enabled" message inline.
export default function StripePortalButton({ children = 'Manage billing', className = 'btn-outline' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.url) {
        window.location.href = body.url;
        return;
      }
      setError(body?.error || `Couldn't open portal (HTTP ${res.status}).`);
    } catch (e) {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1.5 items-start">
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? 'Opening…' : children}
      </button>
      {error && (
        <span className="text-xs text-pink-bright max-w-xs">{error}</span>
      )}
    </div>
  );
}
