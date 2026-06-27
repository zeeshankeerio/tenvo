import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  TENVO_ASSISTANT_KNOWLEDGE,
  TENVO_PARENT_COMPANY,
} from '@/lib/marketing/tenvo-assistant-knowledge';

export const maxDuration = 60;

/**
 * Default: Gemini 3.1 Flash-Lite (preview), low-latency / low-cost tier per Google model list.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 * If this 404s in your region, set GOOGLE_GENERATIVE_AI_MODEL to one of:
 *   gemini-flash-lite-latest  (alias → current Flash-Lite)
 *   gemini-2.5-flash-lite       (stable prior-gen Flash-Lite)
 */
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

const STREAM_HEADERS = {
  'Cache-Control': 'no-store',
};

function buildSystemPrompt(leadHint) {
  const lead = leadHint?.email
    ? `\nVisitor context (optional): they shared email ${leadHint.email}${leadHint.company ? `, company ${leadHint.company}` : ''}. Acknowledge once if relevant; invite them to book /demo or submit /contact.`
    : '';
  return `${TENVO_ASSISTANT_KNOWLEDGE}

## Response style
- Use Markdown: hyphen bullets for lists, **bold** for key terms, and [link text](URL) for links. Prefer same-site paths like /demo, /register, and /contact when those pages exist.
- Short paragraphs, max ~120 words unless the user asks for detail.
- End with a clear next step when appropriate: /register, /demo, /contact, or Mindscape contact ${TENVO_PARENT_COMPANY.contactPage}.
${lead}`;
}

function googleProviderOptions() {
  const tier = process.env.GOOGLE_GENERATIVE_AI_SERVICE_TIER?.trim();
  if (tier === 'flex' || tier === 'priority' || tier === 'standard') {
    return { google: { serviceTier: tier } };
  }
  return undefined;
}

function streamWithOpenRouter(messages, system) {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://tenvo.mindscapeanalytics.com',
    appName: 'TENVO Marketing Assistant',
    compatibility: 'strict',
  });
  const modelId = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  return streamText({
    model: openrouter.chat(modelId),
    system,
    messages,
    temperature: 0.35,
    maxOutputTokens: 1024,
    maxRetries: 2,
  });
}

function streamWithGemini(messages, system) {
  const googleGenAI = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  const modelId =
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return streamText({
    model: googleGenAI(modelId),
    system,
    messages,
    temperature: 0.35,
    maxOutputTokens: 1024,
    maxRetries: 2,
    providerOptions: googleProviderOptions(),
  });
}

/**
 * Who goes first when both keys exist (default: Gemini = cheaper at scale).
 * MARKETING_ASSISTANT_PRIMARY=openrouter → OpenRouter first, then Gemini.
 */
function primaryProvider() {
  const gemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openrouter = !!process.env.OPENROUTER_API_KEY;
  const want =
    (process.env.MARKETING_ASSISTANT_PRIMARY || 'gemini').toLowerCase();

  if (!gemini && !openrouter) return null;
  if (want === 'openrouter' && openrouter) {
    return { first: 'openrouter', second: gemini ? 'gemini' : null };
  }
  if (gemini) {
    return { first: 'gemini', second: openrouter ? 'openrouter' : null };
  }
  return { first: 'openrouter', second: null };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messagesRaw = Array.isArray(body.messages) ? body.messages : [];
  const lead = body.lead && typeof body.lead === 'object' ? body.lead : null;

  const messages = messagesRaw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-12);

  if (!messages.length || !messages.some((m) => m.role === 'user')) {
    return Response.json({ error: 'messages must include at least one user turn' }, { status: 400 });
  }

  const system = buildSystemPrompt(lead);
  const plan = primaryProvider();

  if (!plan) {
    return Response.json(
      {
        error: 'Assistant not configured',
        hint:
          'Set GOOGLE_GENERATIVE_AI_API_KEY (Gemini, default first) and/or OPENROUTER_API_KEY. Optional: MARKETING_ASSISTANT_PRIMARY=openrouter, GOOGLE_GENERATIVE_AI_SERVICE_TIER=flex.',
      },
      { status: 503 }
    );
  }

  const run = (which) =>
    which === 'gemini'
      ? streamWithGemini(messages, system)
      : streamWithOpenRouter(messages, system);

  const headersFor = (which, fallbackFrom) => ({
    ...STREAM_HEADERS,
    'X-TENVO-Assistant-Provider': which,
    ...(fallbackFrom
      ? { 'X-TENVO-Assistant-Fallback-From': fallbackFrom }
      : {}),
  });

  try {
    const result = run(plan.first);
    return result.toTextStreamResponse({
      headers: headersFor(plan.first, null),
    });
  } catch (firstErr) {
    console.error(
      `[marketing/assistant] ${plan.first} failed; trying fallback`,
      firstErr
    );
    if (!plan.second) {
      console.error('[marketing/assistant] no fallback', firstErr);
      return Response.json(
        {
          error: 'Assistant temporarily unavailable.',
          hint: 'Try again or use /contact.',
        },
        { status: 503 }
      );
    }
    try {
      const result = run(plan.second);
      return result.toTextStreamResponse({
        headers: headersFor(plan.second, plan.first),
      });
    } catch (secondErr) {
      console.error('[marketing/assistant] fallback failed', secondErr);
      return Response.json(
        {
          error: 'Assistant temporarily unavailable.',
          hint: 'Try again or use /contact.',
        },
        { status: 503 }
      );
    }
  }
}
