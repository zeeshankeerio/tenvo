/**
 * Enterprise Color System — unified professional theme (Busy / Zoho / Odoo class).
 * All domains share the same palette; CSS tokens live in app/globals.css.
 */
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_DARK,
  HALF_WHITE,
  SUPER_WHITE,
  CHART_PALETTE,
} from './theme/brandTokens';

const enterpriseTheme = {
  primary: BRAND_PRIMARY,
  primaryLight: BRAND_PRIMARY_LIGHT,
  primaryDark: BRAND_PRIMARY_DARK,
  accent: '#C49C3B',

  bg: HALF_WHITE,
  bgElevated: SUPER_WHITE,
  text: '#171717',
  textSecondary: '#525252',
  textMuted: '#717171',

  stats: {
    revenue: {
      bg: 'bg-success-light',
      text: 'text-success-dark',
      icon: 'text-success',
      iconColor: 'text-success',
      border: 'border-success/20',
    },
    orders: {
      bg: 'bg-info-light',
      text: 'text-info-dark',
      icon: 'text-info',
      iconColor: 'text-info',
      border: 'border-info/20',
    },
    products: {
      bg: 'bg-warning-light',
      text: 'text-warning-dark',
      icon: 'text-warning',
      iconColor: 'text-warning',
      border: 'border-warning/20',
    },
    customers: {
      bg: 'bg-brand-50',
      text: 'text-brand-primary-dark',
      icon: 'text-brand-primary',
      iconColor: 'text-brand-primary',
      border: 'border-brand-100',
    },
  },

  button: 'bg-brand-primary hover:bg-brand-primary-dark text-white shadow-brand',
  buttonSecondary: 'bg-super-white hover:bg-half-white text-neutral-700 border border-neutral-200',
  buttonGhost: 'bg-transparent hover:bg-brand-50 text-neutral-700',

  sidebar: 'bg-super-white border-r border-neutral-200',
  sidebarText: 'text-neutral-800',

  border: 'border-neutral-200',
  shadow: 'shadow-md',
  shadowHover: 'hover:shadow-lg',

  chartPalette: CHART_PALETTE,
};

export const domainColorSchemes = {
  'auto-parts': enterpriseTheme,
  'retail-shop': enterpriseTheme,
  pharmacy: enterpriseTheme,
  chemical: enterpriseTheme,
  'food-beverages': enterpriseTheme,
  ecommerce: enterpriseTheme,
  'computer-hardware': enterpriseTheme,
  furniture: enterpriseTheme,
  'book-publishing': enterpriseTheme,
  travel: enterpriseTheme,
  fmcg: enterpriseTheme,
  electrical: enterpriseTheme,
  'paper-mill': enterpriseTheme,
  paint: enterpriseTheme,
  mobile: enterpriseTheme,
  garments: enterpriseTheme,
  agriculture: enterpriseTheme,
  'gems-jewellery': enterpriseTheme,
  'electronics-goods': enterpriseTheme,
  'real-estate': enterpriseTheme,
  grocery: enterpriseTheme,
  'textile-wholesale': enterpriseTheme,
  'textile-manufacturing': enterpriseTheme,
  electronics: enterpriseTheme,
  'mobile-accessories': enterpriseTheme,
  appliances: enterpriseTheme,
  'garments-wholesale': enterpriseTheme,
  'garments-retail': enterpriseTheme,
  boutique: enterpriseTheme,
  'boutique-fashion': enterpriseTheme,
  'bakery-confectionery': enterpriseTheme,
  'bookshop-stationery': enterpriseTheme,
  supermarket: enterpriseTheme,
};

export const defaultScheme = enterpriseTheme;

/** @param {string} _category */
export function getDomainColors(_category) {
  return enterpriseTheme;
}
