import localFont from 'next/font/local';

/** Primary UI + marketing sans — self-hosted (no Google Fonts fetch at build). */
export const openSans = localFont({
  src: [
    {
      path: '../public/fonts/open-sans/open-sans-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/open-sans/open-sans-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/open-sans/open-sans-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/open-sans/open-sans-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-open-sans',
  display: 'swap',
  preload: true,
});

/** Shared stack for inline email / print fallbacks */
export const FONT_SANS_STACK =
  "'Open Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const FONT_MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
