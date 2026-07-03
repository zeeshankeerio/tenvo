'use client';

import { UnstitchedShowcase } from './FashionCategoryShowcase';
import { FashionCircleShowcase } from './FashionCircleShowcase';
import { NewArrivalsRail } from './NewArrivalsRail';
import { DomainEditorialSpotlight } from '@/components/storefront/sections/DomainEditorialSpotlight';
import { StoreReveal } from '@/components/storefront/effects/StoreReveal';

/**
 * Editorial fashion homepage: unstitched, editorial spotlight, RTW, accessories, new arrivals.
 * @param {{ animations?: boolean }} props owner effects toggle.
 */
export function FashionDepartmentSections({
  sections,
  businessDomain,
  editorialSpotlight,
  accent,
  accentDark,
  animations = true,
  renderReadyToWear = true,
}) {
  if (!sections) return null;

  return (
    <>
      {sections.unstitched?.show && (
        <StoreReveal enabled={animations}>
          <UnstitchedShowcase
            title={sections.unstitched.title}
            tiles={sections.unstitched.tiles}
            viewAllHref={sections.unstitched.viewAllHref}
            animate={animations}
            accent={accent}
          />
        </StoreReveal>
      )}

      {editorialSpotlight ? (
        <StoreReveal enabled={animations} className="border-t border-stone-100 bg-white pt-2 sm:pt-4">
          <DomainEditorialSpotlight
            spotlight={editorialSpotlight}
            accent={accent}
            accentDark={accentDark}
            businessDomain={businessDomain}
            variant="editorial"
          />
        </StoreReveal>
      ) : null}

      {renderReadyToWear && sections.readyToWear?.show && (
        <StoreReveal enabled={animations}>
          <FashionCircleShowcase
            title={sections.readyToWear.title}
            circles={sections.readyToWear.circles}
            viewAllHref={sections.readyToWear.viewAllHref}
            showDivider={!editorialSpotlight}
            variant="white"
            animate={animations}
            accent={accent}
          />
        </StoreReveal>
      )}

      {sections.accessories?.show && (
        <StoreReveal enabled={animations}>
          <FashionCircleShowcase
            title={sections.accessories.title}
            circles={sections.accessories.circles}
            viewAllHref={sections.accessories.viewAllHref}
            showDivider
            variant="muted"
            animate={animations}
            accent={accent}
          />
        </StoreReveal>
      )}

      {sections.offers?.show && (
        <StoreReveal enabled={animations}>
          <NewArrivalsRail
            title={sections.offers.title}
            products={sections.offers.products}
            catalogPool={sections.offers.catalogPool}
            businessDomain={businessDomain}
            viewAllHref={sections.offers.viewAllHref}
            animate={animations}
            variant="offers"
            accent={accent}
          />
        </StoreReveal>
      )}

      {sections.newArrivals?.show && (
        <StoreReveal enabled={animations}>
          <NewArrivalsRail
            title={sections.newArrivals.title}
            products={sections.newArrivals.products}
            catalogPool={sections.newArrivals.catalogPool}
            businessDomain={businessDomain}
            viewAllHref={sections.newArrivals.viewAllHref}
            animate={animations}
            accent={accent}
          />
        </StoreReveal>
      )}
    </>
  );
}
