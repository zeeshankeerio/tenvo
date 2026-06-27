'use client';

import Link from 'next/link';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { AUTH_PANEL } from '@/lib/auth/authPanelContent';
import { cn } from '@/lib/utils';

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AuthBrandPanel({ variant = 'login' }) {
  const content = AUTH_PANEL[variant] || AUTH_PANEL.login;

  return (
    <aside className="relative hidden min-h-0 shrink-0 flex-col justify-between overflow-hidden border-r border-white/10 bg-[#0a0a0b] lg:flex lg:w-[42%] xl:w-[44%]">
      {/* Ambient layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-wine/25 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-10 py-10 xl:px-12 xl:py-12">
        <TenvoTextLogo
          textClassName="text-white"
          taglineClassName="text-white/50"
          iconClassName="h-10 w-10 shadow-lg shadow-wine/30"
        />

        <div className="mt-10 space-y-4 xl:mt-12">
          <h1 className="max-w-md text-[2rem] font-semibold leading-[1.12] tracking-tight text-white xl:text-[2.35rem]">
            {AUTH_PANEL.headline[0]}
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              {AUTH_PANEL.headline[1]}
            </span>
          </h1>
          <p className="max-w-md text-[15px] font-medium leading-relaxed text-white/60">
            {content.tagline}
          </p>
        </div>

        <ul className="mt-8 space-y-3 xl:mt-10">
          {content.features.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-wine">
                  <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold leading-tight text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/50">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-10 border-t border-white/[0.08] px-10 py-5 xl:px-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
          {content.footnote}
        </p>
      </div>
    </aside>
  );
}

/**
 * Split-panel auth layout, 2026 SaaS style, fits laptop viewports without page scroll.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  maxWidthClass = 'max-w-[420px]',
  headerRight = null,
  stepIndicator = null,
  footer = null,
  variant = 'login',
  /** @deprecated use variant, kept for register compat */
  panelTagline,
}) {
  void panelTagline;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#f4f6fa] lg:flex-row">
      <AuthBrandPanel variant={variant} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile brand strip */}
        <div className="shrink-0 border-b border-neutral-200/80 bg-[#0a0a0b] px-4 py-3 lg:hidden">
          <TenvoTextLogo
            textClassName="text-white"
            taglineClassName="text-white/50"
            iconClassName="h-8 w-8"
          />
        </div>

        <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10 lg:py-5">
          {stepIndicator ? (
            <div className="flex flex-1 items-center gap-3">
              {stepIndicator}
              <span className="hidden text-xs font-semibold text-gray-400 sm:inline">Setup progress</span>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {headerRight}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full items-center justify-center px-5 pb-8 pt-2 sm:px-8 lg:px-10 lg:pb-10">
            <div className={cn('w-full shrink-0', maxWidthClass)}>
              <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.03]">
                {(title || subtitle) && (
                  <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50/90 to-white px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
                    {title ? (
                      <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-[1.35rem]">
                        {title}
                      </h2>
                    ) : null}
                    {subtitle ? (
                      <p className="mt-1.5 text-sm font-medium leading-snug text-gray-500">{subtitle}</p>
                    ) : null}
                  </div>
                )}
                <div className="px-6 py-5 sm:px-7 sm:py-6">{children}</div>
              </div>
              {footer}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'Or' }) {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export function AuthFooterLink({ prompt, href, linkLabel }) {
  return (
    <p className="mt-5 text-center text-sm text-gray-500">
      {prompt}{' '}
      <Link href={href} className="font-bold text-wine hover:underline underline-offset-4">
        {linkLabel}
      </Link>
    </p>
  );
}

export function AuthGoogleButton({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.99] disabled:opacity-50',
        className
      )}
      {...props}
    >
      <GoogleIcon className="h-[18px] w-[18px]" />
      {children}
    </button>
  );
}

export const authInputClass =
  'h-11 rounded-xl border-gray-200 bg-gray-50/50 text-sm font-medium shadow-none transition-colors placeholder:text-gray-400 focus:border-wine/35 focus:bg-white focus:ring-2 focus:ring-wine/10';

export const authLabelClass =
  'text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500';
