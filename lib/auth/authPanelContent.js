import { FileText, Package, Landmark, Store, Sparkles, ShieldCheck, Globe2 } from 'lucide-react';

/** Left-panel marketing copy — keep aligned with shipped hub modules. */
export const AUTH_PANEL = {
  headline: ['Run your business', 'in one workspace.'],
  login: {
    tagline:
      'Invoices, inventory, finance, and your public storefront unified for owners, accountants, and store teams.',
    features: [
      {
        icon: FileText,
        title: 'Sales & billing',
        description: 'Invoices, estimates, customer AR, and regional tax-ready documents.',
      },
      {
        icon: Package,
        title: 'Inventory & POS',
        description: 'Products, stock, batches, and counter sales in one flow.',
      },
      {
        icon: Landmark,
        title: 'Finance hub',
        description: 'Payments, general ledger, aging, and compliance reports.',
      },
      {
        icon: Store,
        title: 'Online storefront',
        description: 'Branded catalog, cart, and secure checkout on your domain.',
      },
    ],
    footnote: 'Multi-business · Role-based access · Encrypted sessions',
  },
  register: {
    tagline:
      'Guided onboarding for your industry - chart of accounts, sample catalog, tax defaults, and a live dashboard in minutes.',
    features: [
      {
        icon: Sparkles,
        title: 'Industry presets',
        description: '62 verticals with tax, inventory, and report templates.',
      },
      {
        icon: Globe2,
        title: 'Regional setup',
        description: 'Country currency, tax labels, and compliance defaults.',
      },
      {
        icon: Store,
        title: 'Storefront included',
        description: 'Public store URL on day one. Refine branding anytime.',
      },
      {
        icon: ShieldCheck,
        title: 'Secure by default',
        description: 'Email verification, tenant isolation, and audit trails.',
      },
    ],
    footnote: 'Free trial on starter · No card required for manual billing',
  },
};
