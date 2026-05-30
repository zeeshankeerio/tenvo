'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useBusiness } from '@/lib/context/BusinessContext';

/**
 * Hook for managing subscription and billing (requires BusinessProvider for `business_id`).
 */
export function useSubscription() {
  const { business } = useBusiness();
  const businessId = business?.id ?? null;

  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!businessId) {
      setSubscription(null);
      return null;
    }
    try {
      const response = await fetch(
        `/api/billing/subscription?business_id=${encodeURIComponent(businessId)}`
      );
      if (!response.ok) throw new Error('Failed to fetch subscription');
      const data = await response.json();
      setSubscription(data.subscription);
      return data.subscription;
    } catch (error) {
      console.error('Fetch subscription error:', error);
      return null;
    }
  }, [businessId]);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data.invoices);
      return data.invoices;
    } catch (error) {
      console.error('Fetch invoices error:', error);
      return [];
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods);
      return data.paymentMethods;
    } catch (error) {
      console.error('Fetch payment methods error:', error);
      return [];
    }
  }, []);

  const initiateCheckout = useCallback(
    async ({ planTier, currency = 'pkr' }) => {
      if (!businessId) {
        toast.error('No active business selected');
        throw new Error('Missing business');
      }
      setIsRedirecting(true);

      try {
        const response = await fetch('/api/billing/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planTier, currency, business_id: businessId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create checkout');
        }

        const data = await response.json();
        if (data.manual && data.success) {
          toast.success(data.message || 'Plan applied (manual billing mode)');
          setIsRedirecting(false);
          await fetchSubscription();
          return data;
        }
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return data;
        }
        throw new Error('No checkout URL returned');
      } catch (error) {
        toast.error(error.message);
        setIsRedirecting(false);
        throw error;
      }
    },
    [businessId, fetchSubscription]
  );

  const openBillingPortal = useCallback(async () => {
    if (!businessId) {
      toast.error('No active business selected');
      return;
    }
    setIsRedirecting(true);

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open billing portal');
      }

      const data = await response.json();
      if (data.manual && data.success) {
        toast(data.message || 'Billing portal unavailable in manual billing mode', { icon: 'ℹ️' });
        setIsRedirecting(false);
        return data;
      }
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
        return data;
      }
      throw new Error('No portal URL returned');
    } catch (error) {
      toast.error(error.message);
      setIsRedirecting(false);
      throw error;
    }
  }, [businessId]);

  const cancelSubscription = useCallback(
    async ({ atPeriodEnd = true } = {}) => {
      if (!businessId) {
        toast.error('No active business selected');
        return;
      }
      setIsLoading(true);

      try {
        const response = await fetch('/api/billing/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ atPeriodEnd, business_id: businessId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to cancel subscription');
        }

        const result = await response.json();

        if (result.manual) {
          toast.success(result.message || 'Plan reset (manual billing mode)');
        } else {
          toast.success(
            atPeriodEnd
              ? 'Subscription will be cancelled at the end of your billing period'
              : 'Subscription cancelled successfully'
          );
        }

        await fetchSubscription();

        return result;
      } catch (error) {
        toast.error(error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, fetchSubscription]
  );

  const updateSubscription = useCallback(
    async (newPlanTier) => {
      if (!businessId) {
        toast.error('No active business selected');
        return;
      }
      setIsLoading(true);

      try {
        const response = await fetch('/api/billing/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPlanTier, business_id: businessId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update subscription');
        }

        const result = await response.json();

        toast.success('Subscription updated successfully');

        await fetchSubscription();

        return result;
      } catch (error) {
        toast.error(error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, fetchSubscription]
  );

  const createCryptoPayment = useCallback(
    async ({ amount, currency = 'usd', cryptoCurrency = 'btc' }) => {
      if (!businessId) {
        toast.error('No active business selected');
        return;
      }
      setIsLoading(true);

      try {
        const response = await fetch('/api/billing/crypto/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency, cryptoCurrency, business_id: businessId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create crypto payment');
        }

        const data = await response.json();
        return data;
      } catch (error) {
        toast.error(error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [businessId]
  );

  const checkCryptoPaymentStatus = useCallback(async (paymentId) => {
    try {
      const response = await fetch(`/api/billing/crypto/status?paymentId=${paymentId}`);
      if (!response.ok) throw new Error('Failed to check payment status');
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Check crypto payment status error:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (businessId) {
      void fetchSubscription();
    } else {
      setSubscription(null);
    }
  }, [businessId, fetchSubscription]);

  return {
    subscription,
    invoices,
    paymentMethods,
    isLoading,
    isRedirecting,
    fetchSubscription,
    fetchInvoices,
    fetchPaymentMethods,
    initiateCheckout,
    openBillingPortal,
    cancelSubscription,
    updateSubscription,
    createCryptoPayment,
    checkCryptoPaymentStatus,
  };
}

export default useSubscription;
