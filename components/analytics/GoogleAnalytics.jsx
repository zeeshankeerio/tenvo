'use client';

import Script from 'next/script';
import { GA_MEASUREMENT_ID } from '@/lib/analytics/tracking';

/** GA4 — set NEXT_PUBLIC_GA_ID in production (e.g. G-XXXXXXXXXX). */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="tenvo-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            anonymize_ip: true,
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
