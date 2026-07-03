/**
 * Per-tenant campaign channel integrations (`businesses.settings.campaigns.integrations`).
 * Platform env vars (RESEND_API_KEY, RESEND_FROM) are fallbacks when tenant uses platform default.
 *
 * Schema (stored on `businesses.settings` JSON):
 * {
 *   campaigns: {
 *     integrations: {
 *       email: { mode, resend_api_key, from_name, from_email, reply_to },
 *       whatsapp: { mode, webhook_url, api_token },
 *       sms: { provider, account_sid, auth_token, from_number },
 *       ai: { mode, endpoint_url, api_key, model },
 *       updated_at
 *     }
 *   }
 * }
 */

const MASK_PREFIX = '••••';

/** @typedef {'platform' | 'resend'} EmailProviderMode */
/** @typedef {'none' | 'webhook'} WhatsAppMode */
/** @typedef {'none' | 'twilio'} SmsProviderMode */
/** @typedef {'platform' | 'openai_compatible'} AiProviderMode */

/**
 * @param {unknown} settings - businesses.settings JSON
 * @returns {Record<string, unknown>}
 */
export function getCampaignIntegrationsFromSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  const campaigns = /** @type {Record<string, unknown>} */ (settings).campaigns;
  if (!campaigns || typeof campaigns !== 'object' || Array.isArray(campaigns)) return {};
  const integrations = /** @type {Record<string, unknown>} */ (campaigns).integrations;
  if (!integrations || typeof integrations !== 'object' || Array.isArray(integrations)) return {};
  return { ...integrations };
}

function parseEmail(integrations) {
  const raw = integrations?.email;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mode: 'platform', from_name: '', from_email: '', reply_to: '' };
  }
  const mode = raw.mode === 'resend' ? 'resend' : 'platform';
  return {
    mode,
    resend_api_key: typeof raw.resend_api_key === 'string' ? raw.resend_api_key : '',
    from_name: typeof raw.from_name === 'string' ? raw.from_name.trim() : '',
    from_email: typeof raw.from_email === 'string' ? raw.from_email.trim() : '',
    reply_to: typeof raw.reply_to === 'string' ? raw.reply_to.trim() : '',
  };
}

function parseWhatsapp(integrations) {
  const raw = integrations?.whatsapp;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mode: 'none', webhook_url: '', api_token: '' };
  }
  return {
    mode: raw.mode === 'webhook' ? 'webhook' : 'none',
    webhook_url: typeof raw.webhook_url === 'string' ? raw.webhook_url.trim() : '',
    api_token: typeof raw.api_token === 'string' ? raw.api_token : '',
  };
}

function parseSms(integrations) {
  const raw = integrations?.sms;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mode: 'none', account_sid: '', auth_token: '', from_number: '' };
  }
  return {
    mode: raw.provider === 'twilio' ? 'twilio' : 'none',
    account_sid: typeof raw.account_sid === 'string' ? raw.account_sid.trim() : '',
    auth_token: typeof raw.auth_token === 'string' ? raw.auth_token : '',
    from_number: typeof raw.from_number === 'string' ? raw.from_number.trim() : '',
  };
}

function parseAi(integrations) {
  const raw = integrations?.ai;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mode: 'platform', endpoint_url: '', api_key: '', model: '' };
  }
  return {
    mode: raw.mode === 'openai_compatible' ? 'openai_compatible' : 'platform',
    endpoint_url: typeof raw.endpoint_url === 'string' ? raw.endpoint_url.trim() : '',
    api_key: typeof raw.api_key === 'string' ? raw.api_key : '',
    model: typeof raw.model === 'string' ? raw.model.trim() : '',
  };
}

export function maskSecret(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.length <= 4) return MASK_PREFIX;
  return `${MASK_PREFIX}${value.slice(-4)}`;
}

export function isMaskedSecretInput(value) {
  if (value == null || value === '') return true;
  return String(value).startsWith(MASK_PREFIX);
}

/**
 * Client-safe view (secrets masked).
 * @param {unknown} settings
 */
export function getCampaignIntegrationsForClient(settings) {
  const integrations = getCampaignIntegrationsFromSettings(settings);
  const email = parseEmail(integrations);
  const whatsapp = parseWhatsapp(integrations);
  const sms = parseSms(integrations);
  const ai = parseAi(integrations);

  return {
    email: {
      mode: email.mode,
      from_name: email.from_name,
      from_email: email.from_email,
      reply_to: email.reply_to,
      resend_api_key: email.resend_api_key ? maskSecret(email.resend_api_key) : '',
      has_resend_api_key: Boolean(email.resend_api_key?.trim()),
    },
    whatsapp: {
      mode: whatsapp.mode,
      webhook_url: whatsapp.webhook_url,
      api_token: whatsapp.api_token ? maskSecret(whatsapp.api_token) : '',
      has_api_token: Boolean(whatsapp.api_token?.trim()),
    },
    sms: {
      provider: sms.mode === 'twilio' ? 'twilio' : 'none',
      from_number: sms.from_number,
      account_sid: sms.account_sid,
      auth_token: sms.auth_token ? maskSecret(sms.auth_token) : '',
      has_auth_token: Boolean(sms.auth_token?.trim()),
    },
    ai: {
      mode: ai.mode,
      endpoint_url: ai.endpoint_url,
      model: ai.model,
      api_key: ai.api_key ? maskSecret(ai.api_key) : '',
      has_api_key: Boolean(ai.api_key?.trim()),
    },
    updated_at: typeof integrations.updated_at === 'string' ? integrations.updated_at : null,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {Record<string, unknown>} payload - form fields from owner UI
 * @param {unknown} prevSettings
 */
export function mergeCampaignIntegrationsIntoSettings(prevSettings, payload) {
  const prev =
    prevSettings && typeof prevSettings === 'object' && !Array.isArray(prevSettings)
      ? { ...prevSettings }
      : {};

  const prevIntegrations = getCampaignIntegrationsFromSettings(prev);
  const prevEmail = parseEmail(prevIntegrations);
  const prevWhatsapp = parseWhatsapp(prevIntegrations);
  const prevSms = parseSms(prevIntegrations);
  const prevAi = parseAi(prevIntegrations);

  const emailIn = payload?.email && typeof payload.email === 'object' ? payload.email : {};
  const emailMode = emailIn.mode === 'resend' ? 'resend' : 'platform';
  let resendKey = prevEmail.resend_api_key;
  if (emailMode === 'resend' && !isMaskedSecretInput(emailIn.resend_api_key)) {
    resendKey = String(emailIn.resend_api_key || '').trim();
  }

  const fromEmail = String(emailIn.from_email ?? prevEmail.from_email ?? '').trim();
  if (fromEmail && !EMAIL_RE.test(fromEmail)) {
    throw new Error('From email must be a valid address');
  }

  const replyTo = String(emailIn.reply_to ?? prevEmail.reply_to ?? '').trim();
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    throw new Error('Reply-to must be a valid email address');
  }

  const whatsappIn = payload?.whatsapp && typeof payload.whatsapp === 'object' ? payload.whatsapp : {};
  const whatsappMode = whatsappIn.mode === 'webhook' ? 'webhook' : 'none';
  let whatsappToken = prevWhatsapp.api_token;
  if (!isMaskedSecretInput(whatsappIn.api_token)) {
    whatsappToken = String(whatsappIn.api_token || '').trim();
  }

  const smsIn = payload?.sms && typeof payload.sms === 'object' ? payload.sms : {};
  const smsProvider = smsIn.provider === 'twilio' ? 'twilio' : 'none';
  let smsAuthToken = prevSms.auth_token;
  if (!isMaskedSecretInput(smsIn.auth_token)) {
    smsAuthToken = String(smsIn.auth_token || '').trim();
  }

  const aiIn = payload?.ai && typeof payload.ai === 'object' ? payload.ai : {};
  const aiMode = aiIn.mode === 'openai_compatible' ? 'openai_compatible' : 'platform';
  let aiKey = prevAi.api_key;
  if (!isMaskedSecretInput(aiIn.api_key)) {
    aiKey = String(aiIn.api_key || '').trim();
  }

  const integrations = {
    email: {
      mode: emailMode,
      resend_api_key: resendKey,
      from_name: String(emailIn.from_name ?? prevEmail.from_name ?? '').trim(),
      from_email: fromEmail,
      reply_to: replyTo,
    },
    whatsapp: {
      mode: whatsappMode,
      webhook_url: String(whatsappIn.webhook_url ?? prevWhatsapp.webhook_url ?? '').trim(),
      api_token: whatsappToken,
    },
    sms: {
      provider: smsProvider,
      account_sid: String(smsIn.account_sid ?? prevSms.account_sid ?? '').trim(),
      auth_token: smsAuthToken,
      from_number: String(smsIn.from_number ?? prevSms.from_number ?? '').trim(),
    },
    ai: {
      mode: aiMode,
      endpoint_url: String(aiIn.endpoint_url ?? prevAi.endpoint_url ?? '').trim(),
      api_key: aiKey,
      model: String(aiIn.model ?? prevAi.model ?? '').trim(),
    },
    updated_at: new Date().toISOString(),
  };

  const campaigns =
    prev.campaigns && typeof prev.campaigns === 'object' && !Array.isArray(prev.campaigns)
      ? { ...prev.campaigns }
      : {};

  return {
    nextSettings: {
      ...prev,
      campaigns: {
        ...campaigns,
        integrations,
      },
    },
    integrations,
  };
}

/**
 * Resolved email delivery config for server-side dispatch.
 * @param {unknown} settings
 */
export function resolveCampaignEmailConfig(settings) {
  const integrations = getCampaignIntegrationsFromSettings(settings);
  const email = parseEmail(integrations);

  const platformKey = process.env.RESEND_API_KEY?.trim() || '';
  const platformFrom = process.env.RESEND_FROM?.trim() || '';

  const tenantKey = email.mode === 'resend' ? email.resend_api_key?.trim() : '';
  const apiKey = tenantKey || platformKey;

  let fromAddress = '';
  if (email.from_name && email.from_email) {
    fromAddress = `${email.from_name} <${email.from_email}>`;
  } else if (email.from_email) {
    fromAddress = email.from_email;
  } else if (platformFrom) {
    fromAddress = platformFrom;
  } else if (process.env.NODE_ENV !== 'production') {
    fromAddress = 'Tenvo <notifications@tenvo.app>';
  }

  return {
    configured: Boolean(apiKey),
    usesTenantKey: Boolean(tenantKey),
    usesPlatformKey: Boolean(!tenantKey && platformKey),
    apiKey,
    from: fromAddress,
    replyTo: email.reply_to || undefined,
  };
}

/**
 * @param {unknown} settings
 */
export function isCampaignEmailConfigured(settings) {
  return resolveCampaignEmailConfig(settings).configured;
}

/**
 * @param {unknown} settings
 * @param {boolean} [smsPlanEnabled]
 */
export function resolveCampaignSmsConfig(settings, smsPlanEnabled = false) {
  if (!smsPlanEnabled) return { configured: false, reason: 'plan' };
  const integrations = getCampaignIntegrationsFromSettings(settings);
  const sms = parseSms(integrations);
  if (sms.mode !== 'twilio') return { configured: false, reason: 'not_configured' };
  const configured = Boolean(sms.account_sid && sms.auth_token && sms.from_number);
  return { configured, accountSid: sms.account_sid, authToken: sms.auth_token, fromNumber: sms.from_number };
}
