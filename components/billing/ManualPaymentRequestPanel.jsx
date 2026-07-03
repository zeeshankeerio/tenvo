'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Banknote, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PLAN_TIERS } from '@/lib/config/plans';
import {
  getManualSubscriptionPaymentContextAction,
  submitManualSubscriptionPaymentRequestAction,
} from '@/lib/actions/basic/billing';
import { MANUAL_PAYMENT_METHODS } from '@/lib/payments/manualPaymentRequests';

const PAID_TIERS = Object.keys(PLAN_TIERS).filter((k) => k !== 'free' && k !== 'enterprise');

/**
 * Owner billing panel: pay offline (JazzCash / bank) and submit transaction ID for activation.
 */
export default function ManualPaymentRequestPanel({
  businessId,
  onSubmitted,
  devBillingMode = false,
  preferredDomainPackageKey = null,
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState([]);
  const [payee, setPayee] = useState({});
  const [domainPackages, setDomainPackages] = useState([]);

  const [skuType, setSkuType] = useState('plan');
  const [planTier, setPlanTier] = useState('business');
  const [domainPackageKey, setDomainPackageKey] = useState('clothing-commerce');
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountMajor, setAmountMajor] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await getManualSubscriptionPaymentContextAction(businessId);
      if (res.success) {
        setPending(res.pending || null);
        setHistory(res.history || []);
        setPayee(res.payeeInstructions || {});
        setDomainPackages(res.domainPackages || []);
        if (res.currentPlanTier && PAID_TIERS.includes(res.currentPlanTier)) {
          setPlanTier(res.currentPlanTier);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!preferredDomainPackageKey) return;
    if (!domainPackages.some((p) => p.key === preferredDomainPackageKey)) return;
    setSkuType('package');
    setDomainPackageKey(preferredDomainPackageKey);
  }, [preferredDomainPackageKey, domainPackages]);

  useEffect(() => {
    if (skuType === 'package') {
      const selected = domainPackages.find((p) => p.key === domainPackageKey);
      if (selected?.pricePkr) setAmountMajor(String(selected.pricePkr));
    } else if (PLAN_TIERS[planTier]?.price_pkr) {
      setAmountMajor(String(PLAN_TIERS[planTier].price_pkr));
    }
  }, [skuType, planTier, domainPackageKey, domainPackages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessId) return;
    setSubmitting(true);
    try {
      const res = await submitManualSubscriptionPaymentRequestAction({
        businessId,
        planTier: skuType === 'plan' ? planTier : undefined,
        domainPackageKey: skuType === 'package' ? domainPackageKey : undefined,
        paymentReference,
        paymentMethod,
        amountMajor: amountMajor.trim() ? Number(amountMajor) : undefined,
        currency: 'PKR',
        notes,
      });
      if (res.success) {
        toast.success(res.message || 'Payment submitted for review.');
        setPaymentReference('');
        setAmountMajor('');
        setNotes('');
        await load();
        onSubmitted?.();
      } else {
        toast.error(res.error || 'Could not submit payment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 py-4">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading offline payment options…
      </div>
    );
  }

  if (pending?.status === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
          <Clock className="h-4 w-4" aria-hidden />
          Payment under review
        </div>
        <p className="text-sm text-amber-950/90">
          We received your reference <strong className="font-semibold">{pending.paymentReference}</strong>
          {pending.domainPackageKey ? ` for package ${pending.domainPackageKey}` : pending.planTier ? ` for ${pending.planTier} plan` : ''}.
          Access upgrades after our team verifies the payment (usually within one business day).
        </p>
        <p className="text-xs text-amber-800">Submitted {new Date(pending.submittedAt).toLocaleString()}</p>
      </div>
    );
  }

  const hasPayeeInfo = payee.jazzcash || payee.easypaisa || payee.bank;

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Banknote className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h4 className="font-semibold text-emerald-950">Pay offline (JazzCash, EasyPaisa, bank)</h4>
          <p className="text-sm text-emerald-900/80 mt-1">
            Send payment to our account, then submit your transaction ID here. We activate your plan or vertical package after verification.
          </p>
          {devBillingMode ? (
            <p className="text-xs text-amber-900/90 mt-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2">
              Development billing is on: plan cards above still apply tiers instantly without payment. Use this form to test the offline submit and admin approval flow.
            </p>
          ) : null}
        </div>
      </div>

      {hasPayeeInfo ? (
        <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 text-xs text-slate-700 space-y-1.5">
          {payee.jazzcash ? <p><span className="font-semibold">JazzCash:</span> {payee.jazzcash}</p> : null}
          {payee.easypaisa ? <p><span className="font-semibold">EasyPaisa:</span> {payee.easypaisa}</p> : null}
          {payee.bank ? <p><span className="font-semibold">Bank:</span> {payee.bank}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-slate-600 rounded-xl border border-dashed border-slate-200 bg-white/60 p-3">
          Payee account details are configured by the platform team.
          {payee.supportEmail ? (
            <>
              {' '}
              Contact{' '}
              <a href={`mailto:${payee.supportEmail}`} className="font-semibold text-emerald-800 underline">
                {payee.supportEmail}
              </a>{' '}
              for payment instructions before transferring.
            </>
          ) : (
            ' Contact support if you need payment instructions before transferring.'
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Purchase type</Label>
            <select
              value={skuType}
              onChange={(e) => setSkuType(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              <option value="plan">Standard plan tier</option>
              <option value="package">Vertical package (e.g. clothing suite)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{skuType === 'package' ? 'Package' : 'Plan tier'}</Label>
            {skuType === 'package' ? (
              <select
                value={domainPackageKey}
                onChange={(e) => setDomainPackageKey(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
              >
                {domainPackages.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} (PKR {p.pricePkr?.toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
              >
                {PAID_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {PLAN_TIERS[tier]?.name || tier} (PKR {PLAN_TIERS[tier]?.price_pkr?.toLocaleString()}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment method</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              {MANUAL_PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Amount paid (PKR, optional)</Label>
            <Input
              type="number"
              min={0}
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              placeholder="e.g. 12999"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Transaction / reference ID</Label>
            <Input
              required
              minLength={4}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Wallet or bank transaction ID"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sender name, screenshot link, or other details"
              className="min-h-[72px] rounded-xl text-sm"
            />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto font-semibold bg-emerald-700 hover:bg-emerald-800">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit payment for verification
        </Button>
      </form>

      {history.length > 0 ? (
        <div className="pt-2 border-t border-emerald-200/60">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Recent submissions</p>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {history.slice(0, 3).map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                {h.status === 'approved' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                )}
                <span>
                  {h.paymentReference} — {h.status}
                  {h.domainPackageKey ? ` (${h.domainPackageKey})` : h.planTier ? ` (${h.planTier})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
