'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

function StripePaymentForm({ accent, onPaid, onCancel, orderNumber }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        setPaid(true);
        toast.success('Payment confirmed!');
        onPaid?.();
        return;
      }

      if (paymentIntent?.status === 'processing') {
        toast('Payment is processing. We will confirm your order shortly.', { icon: '⏳' });
        onPaid?.();
        return;
      }

      toast.error('Payment was not completed. Please try again.');
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (paid) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-semibold text-gray-900">Payment received</h2>
        <p className="text-sm text-gray-500 mt-2">Order #{orderNumber} is confirmed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 rounded-xl font-bold"
          style={{ backgroundColor: accent }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing…
            </>
          ) : (
            'Pay now'
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Storefront checkout — Stripe Payment Element after order is created.
 */
export function StripeCheckoutPanel({
  businessDomain,
  orderNumber,
  customerEmail,
  accent,
  onPaid,
  onCancel,
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || '';
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const loadIntent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/${businessDomain}/stripe/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, customerEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.clientSecret) {
        throw new Error(data.error || 'Could not start card payment');
      }
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err.message || 'Card payment unavailable');
    } finally {
      setLoading(false);
    }
  }, [businessDomain, customerEmail, orderNumber]);

  useEffect(() => {
    void loadIntent();
  }, [loadIntent]);

  if (!publishableKey || !stripePromise) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Card payments are not configured. Please contact the store or choose Cash on Delivery.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5" style={{ color: accent }} />
        <h2 className="text-lg font-bold text-gray-900">Pay with card</h2>
      </div>
      <p className="text-sm text-gray-600">
        Order <span className="font-semibold">#{orderNumber}</span> — secure payment processed by Stripe.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button type="button" variant="outline" onClick={loadIntent} className="rounded-xl">
            Try again
          </Button>
        </div>
      ) : clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            accent={accent}
            orderNumber={orderNumber}
            onPaid={onPaid}
            onCancel={onCancel}
          />
        </Elements>
      ) : null}
    </div>
  );
}
