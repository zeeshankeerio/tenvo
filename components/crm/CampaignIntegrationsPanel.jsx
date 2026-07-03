'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plug, Mail, MessageCircle, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  getCampaignIntegrationsAction,
  updateCampaignIntegrationsAction,
  testCampaignEmailConnectionAction,
} from '@/lib/actions/standard/campaignsHub';
import { CAPABILITY_STATUS_LABEL } from '@/lib/marketing/capabilities';

const STATUS_BADGE = {
  shipped: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  partial: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  roadmap: 'bg-muted text-muted-foreground',
};

function FieldRow({ label, hint, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[10px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Owner-configurable campaign channel integrations (Resend, SMS, WhatsApp webhook, AI).
 */
export function CampaignIntegrationsPanel({ businessId }) {
  const { can, planCan } = usePermissions();
  const canManage = can('crm.manage_campaigns');
  const smsPlanEnabled = planCan('sms_campaigns');
  const genAiPlanEnabled = planCan('genai_email_campaigns');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [emailDelivery, setEmailDelivery] = useState(null);
  const [form, setForm] = useState({
    email: { mode: 'platform', resend_api_key: '', from_name: '', from_email: '', reply_to: '' },
    whatsapp: { mode: 'none', webhook_url: '', api_token: '' },
    sms: { provider: 'none', account_sid: '', auth_token: '', from_number: '' },
    ai: { mode: 'platform', endpoint_url: '', api_key: '', model: '' },
  });

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await getCampaignIntegrationsAction(businessId);
      if (res.success) {
        setEmailDelivery(res.emailDelivery || null);
        const i = res.integrations || {};
        setForm({
          email: {
            mode: i.email?.mode || 'platform',
            resend_api_key: i.email?.resend_api_key || '',
            from_name: i.email?.from_name || '',
            from_email: i.email?.from_email || '',
            reply_to: i.email?.reply_to || '',
          },
          whatsapp: {
            mode: i.whatsapp?.mode || 'none',
            webhook_url: i.whatsapp?.webhook_url || '',
            api_token: i.whatsapp?.api_token || '',
          },
          sms: {
            provider: i.sms?.provider || 'none',
            account_sid: i.sms?.account_sid || '',
            auth_token: i.sms?.auth_token || '',
            from_number: i.sms?.from_number || '',
          },
          ai: {
            mode: i.ai?.mode || 'platform',
            endpoint_url: i.ai?.endpoint_url || '',
            api_key: i.ai?.api_key || '',
            model: i.ai?.model || '',
          },
        });
      } else {
        toast.error(res.error || 'Could not load integrations');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!businessId || !canManage) return;
    setSaving(true);
    try {
      const res = await updateCampaignIntegrationsAction(businessId, form);
      if (res.success) {
        toast.success('Integrations saved');
        setEmailDelivery(res.emailDelivery || null);
        if (res.integrations) {
          setForm((prev) => ({
            email: { ...prev.email, ...res.integrations.email, resend_api_key: res.integrations.email?.resend_api_key || '' },
            whatsapp: { ...prev.whatsapp, ...res.integrations.whatsapp, api_token: res.integrations.whatsapp?.api_token || '' },
            sms: { ...prev.sms, ...res.integrations.sms, auth_token: res.integrations.sms?.auth_token || '' },
            ai: { ...prev.ai, ...res.integrations.ai, api_key: res.integrations.ai?.api_key || '' },
          }));
        }
      } else {
        toast.error(res.error || 'Save failed');
      }
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    if (!businessId || !canManage) return;
    setTesting(true);
    try {
      const override =
        form.email.mode === 'resend' && form.email.resend_api_key && !form.email.resend_api_key.startsWith('••••')
          ? form.email.resend_api_key
          : undefined;
      const res = await testCampaignEmailConnectionAction(businessId, { apiKeyOverride: override });
      if (res.success) {
        toast.success(`Resend connected (${res.domainCount ?? 0} domains on account)`);
      } else {
        toast.error(res.error || 'Test failed');
      }
    } catch (e) {
      toast.error(e.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (!businessId) {
    return <p className="text-sm text-muted-foreground">Select a business to configure integrations.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading integrations…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/80 p-3 lg:p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Plug className="h-3 w-3" aria-hidden />
              Channel integrations
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use your own API keys for accurate sender identity. Platform defaults apply when you choose platform
              mode for email.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={cn('text-[10px]', STATUS_BADGE[emailDelivery?.configured ? 'shipped' : 'partial'])}>
              Email: {emailDelivery?.configured ? CAPABILITY_STATUS_LABEL.shipped : CAPABILITY_STATUS_LABEL.partial}
            </Badge>
            <Badge className={cn('text-[10px]', STATUS_BADGE.roadmap)}>WhatsApp: {CAPABILITY_STATUS_LABEL.roadmap}</Badge>
            <Badge
              className={cn(
                'text-[10px]',
                STATUS_BADGE[smsPlanEnabled ? 'partial' : 'roadmap']
              )}
            >
              SMS: {smsPlanEnabled ? CAPABILITY_STATUS_LABEL.partial : CAPABILITY_STATUS_LABEL.roadmap}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Email (Resend)</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Custom key overrides platform RESEND_API_KEY. From name and email must match a verified Resend domain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 pt-0">
            <FieldRow label="Provider">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                value={form.email.mode}
                disabled={!canManage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: { ...f.email, mode: e.target.value } }))
                }
              >
                <option value="platform">Platform default (env RESEND_API_KEY)</option>
                <option value="resend">My Resend API key</option>
              </select>
            </FieldRow>
            {form.email.mode === 'resend' && (
              <FieldRow label="Resend API key" hint="Stored on your business settings. Shown masked after save.">
                <Input
                  type="password"
                  autoComplete="off"
                  className="h-9 text-sm"
                  disabled={!canManage}
                  value={form.email.resend_api_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: { ...f.email, resend_api_key: e.target.value } }))
                  }
                  placeholder="re_…"
                />
              </FieldRow>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldRow label="From name">
                <Input
                  className="h-9 text-sm"
                  disabled={!canManage}
                  value={form.email.from_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: { ...f.email, from_name: e.target.value } }))
                  }
                  placeholder="Your Store"
                />
              </FieldRow>
              <FieldRow label="From email">
                <Input
                  type="email"
                  className="h-9 text-sm"
                  disabled={!canManage}
                  value={form.email.from_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: { ...f.email, from_email: e.target.value } }))
                  }
                  placeholder="hello@yourdomain.com"
                />
              </FieldRow>
            </div>
            <FieldRow label="Reply-to (optional)">
              <Input
                type="email"
                className="h-9 text-sm"
                disabled={!canManage}
                value={form.email.reply_to}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: { ...f.email, reply_to: e.target.value } }))
                }
              />
            </FieldRow>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={testing}
                onClick={testEmail}
              >
                {testing ? 'Testing…' : 'Test Resend connection'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">WhatsApp</CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {CAPABILITY_STATUS_LABEL.roadmap}
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Store webhook credentials for future automation. Sending is not live yet; use email outreach today.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 pt-0">
            <FieldRow label="Mode">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                value={form.whatsapp.mode}
                disabled={!canManage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsapp: { ...f.whatsapp, mode: e.target.value } }))
                }
              >
                <option value="none">Not configured</option>
                <option value="webhook">Webhook / API (roadmap)</option>
              </select>
            </FieldRow>
            {form.whatsapp.mode === 'webhook' && (
              <>
                <FieldRow label="Webhook URL">
                  <Input
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.whatsapp.webhook_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, whatsapp: { ...f.whatsapp, webhook_url: e.target.value } }))
                    }
                    placeholder="https://…"
                  />
                </FieldRow>
                <FieldRow label="API token" hint="Masked after save. Not used for live sends yet.">
                  <Input
                    type="password"
                    autoComplete="off"
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.whatsapp.api_token}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, whatsapp: { ...f.whatsapp, api_token: e.target.value } }))
                    }
                  />
                </FieldRow>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">SMS (Twilio-style)</CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {smsPlanEnabled ? CAPABILITY_STATUS_LABEL.partial : CAPABILITY_STATUS_LABEL.roadmap}
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              {smsPlanEnabled
                ? 'Credentials are saved for when SMS dispatch ships. Sending is not wired yet.'
                : 'Upgrade to a plan with sms_campaigns to save provider credentials.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 pt-0">
            <FieldRow label="Provider">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                value={form.sms.provider}
                disabled={!canManage || !smsPlanEnabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sms: { ...f.sms, provider: e.target.value } }))
                }
              >
                <option value="none">Not configured</option>
                <option value="twilio">Twilio</option>
              </select>
            </FieldRow>
            {form.sms.provider === 'twilio' && smsPlanEnabled && (
              <>
                <FieldRow label="Account SID">
                  <Input
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.sms.account_sid}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sms: { ...f.sms, account_sid: e.target.value } }))
                    }
                  />
                </FieldRow>
                <FieldRow label="Auth token" hint="Masked after save.">
                  <Input
                    type="password"
                    autoComplete="off"
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.sms.auth_token}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sms: { ...f.sms, auth_token: e.target.value } }))
                    }
                  />
                </FieldRow>
                <FieldRow label="From number">
                  <Input
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.sms.from_number}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sms: { ...f.sms, from_number: e.target.value } }))
                    }
                    placeholder="+1…"
                  />
                </FieldRow>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">AI copy (optional)</CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {genAiPlanEnabled ? CAPABILITY_STATUS_LABEL.partial : CAPABILITY_STATUS_LABEL.roadmap}
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              OpenAI-compatible endpoint for smarter campaign copy when genai_email_campaigns is enabled. Generation UI
              is partial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 pt-0">
            <FieldRow label="Mode">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                value={form.ai.mode}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, ai: { ...f.ai, mode: e.target.value } }))}
              >
                <option value="platform">Platform AI (when available)</option>
                <option value="openai_compatible">My endpoint</option>
              </select>
            </FieldRow>
            {form.ai.mode === 'openai_compatible' && (
              <>
                <FieldRow label="Endpoint URL">
                  <Input
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.ai.endpoint_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ai: { ...f.ai, endpoint_url: e.target.value } }))
                    }
                    placeholder="https://api.openai.com/v1"
                  />
                </FieldRow>
                <FieldRow label="API key" hint="Masked after save.">
                  <Input
                    type="password"
                    autoComplete="off"
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.ai.api_key}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ai: { ...f.ai, api_key: e.target.value } }))
                    }
                  />
                </FieldRow>
                <FieldRow label="Model (optional)">
                  <Input
                    className="h-9 text-sm"
                    disabled={!canManage}
                    value={form.ai.model}
                    onChange={(e) => setForm((f) => ({ ...f, ai: { ...f.ai, model: e.target.value } }))}
                    placeholder="gpt-4o-mini"
                  />
                </FieldRow>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={load} disabled={saving}>
            Reset
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save integrations'}
          </Button>
        </div>
      )}
    </div>
  );
}
