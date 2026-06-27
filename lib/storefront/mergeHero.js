/**
 * Merge registration / admin storefront JSON with domain template defaults.
 * Used by the public store home hero and announcement strip.
 *
 * @param {{ settings?: Record<string, unknown>; domainCfg: Record<string, unknown>; business: { business_name?: string; description?: string | null } }} args
 */
export function getMergedStorefrontHero({ settings, domainCfg, business }) {
  const sf =
    settings?.storefront && typeof settings.storefront === 'object' && !Array.isArray(settings.storefront)
      ? settings.storefront
      : {};

  const title =
    (typeof sf.heroTitle === 'string' && sf.heroTitle.trim()) ||
    (typeof settings?.heroTitle === 'string' && settings.heroTitle.trim()) ||
    (typeof domainCfg?.heroTagline === 'string' && domainCfg.heroTagline) ||
    business?.business_name ||
    'Shop';

  const subtitle =
    (typeof sf.heroSubtitle === 'string' && sf.heroSubtitle.trim()) ||
    (typeof settings?.heroSubtitle === 'string' && settings.heroSubtitle.trim()) ||
    (typeof business?.description === 'string' && business.description.trim()) ||
    (typeof domainCfg?.heroSubtitle === 'string' && domainCfg.heroSubtitle) ||
    '';

  const banner =
    (typeof sf.announcement === 'string' && sf.announcement.trim()) ||
    (typeof settings?.announcement === 'string' && settings.announcement.trim()) ||
    (typeof domainCfg?.bannerText === 'string' && domainCfg.bannerText) ||
    '';

  return { title, subtitle, banner };
}
