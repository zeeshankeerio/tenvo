'use client';

import { FashionHomeEditSection } from '@/components/storefront/sections/fashion/FashionHomeEditSection';
import { FashionSaleMosaicSection } from '@/components/storefront/sections/fashion/FashionSaleMosaicSection';
import { StoreReveal } from '@/components/storefront/effects/StoreReveal';
import {
  getFashionGulSectionsConfig,
  resolveFashionHomeEdit,
  resolveFashionSaleMosaic,
} from '@/lib/storefront/fashionGulSections';

/**
 * Gul Ahmed–style Home Edit + Sale mosaic blocks for fashion / textile / jewellery stores.
 */
export function FashionGulAhmedSections({
  businessDomain,
  businessCategory,
  settings = {},
  animations = true,
}) {
  const storeBase = `/store/${businessDomain}`;
  const config = getFashionGulSectionsConfig(settings, businessDomain);
  const homeEdit = config.showHomeEdit
    ? resolveFashionHomeEdit(settings, businessCategory, businessDomain, storeBase)
    : null;
  const saleMosaic = config.showSaleMosaic
    ? resolveFashionSaleMosaic(settings, businessCategory, businessDomain, storeBase)
    : null;

  if (!homeEdit && !saleMosaic) return null;

  return (
    <>
      {homeEdit ? (
        <StoreReveal enabled={animations}>
          <FashionHomeEditSection section={homeEdit} />
        </StoreReveal>
      ) : null}
      {saleMosaic ? (
        <StoreReveal enabled={animations}>
          <FashionSaleMosaicSection section={saleMosaic} />
        </StoreReveal>
      ) : null}
    </>
  );
}
