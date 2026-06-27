import type { Metadata } from 'next'
import './globals.css'
import { openSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { BusinessProvider } from '@/lib/context/BusinessContext'
import { AuthProvider } from '@/lib/context/AuthContext'
import { LanguageProvider } from '@/lib/context/LanguageContext'
import { BusyModeProvider } from '@/lib/context/BusyModeContext'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { DefaultJsonLd } from '@/components/marketing/DefaultJsonLd'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { getSiteUrl } from '@/lib/marketing/site-url'

const site = new URL(getSiteUrl())

export const metadata: Metadata = {
  metadataBase: site,
  title: {
    default: 'TENVO: Inventory, POS, storefront, and accounting in one platform',
    template: '%s | TENVO',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/tenvo.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/tenvo.svg'],
    apple: [{ url: '/tenvo.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={openSans.variable} suppressHydrationWarning>
      <body
        className={cn(openSans.className, 'min-h-dvh overflow-x-clip font-sans antialiased')}
        suppressHydrationWarning
      >
        <DefaultJsonLd />
        <GoogleAnalytics />
        <ErrorBoundary>
          <AuthProvider>
            <BusinessProvider>
              <LanguageProvider>
                <BusyModeProvider>
                  <ToastProvider />
                  <CommandPalette />
                  {children}
                </BusyModeProvider>
              </LanguageProvider>
            </BusinessProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
