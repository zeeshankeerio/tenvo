'use client';

import { UnstitchedShowcase } from './FashionCategoryShowcase';
import { FashionCircleShowcase } from './FashionCircleShowcase';
import { NewArrivalsRail } from './NewArrivalsRail';
import { DomainEditorialSpotlight } from '@/components/storefront/sections/DomainEditorialSpotlight';

/**
 * Editorial fashion homepage: unstitched, editorial spotlight, RTW, accessories, new arrivals.
 */
export function FashionDepartmentSections({
  sections,
  businessDomain,
  editorialSpotlight,
  accent,
  accentDark,
}) {
  if (!sections) return null;

  return (
    <>
      {sections.unstitched?.show && (
        <UnstitchedShowcase
          title={sections.unstitched.title}
          tiles={sections.unstitched.tiles}
          viewAllHref={sections.unstitched.viewAllHref}
        />
      )}

      {editorialSpotlight ? (
        <div className="border-t border-stone-100 bg-white pt-2 sm:pt-4">
          <DomainEditorialSpotlight
            spotlight={editorialSpotlight}
            accent={accent}
            accentDark={accentDark}
            businessDomain={businessDomain}
            variant="editorial"
          />
        </div>
      ) : null}

      {sections.readyToWear?.show && (
        <FashionCircleShowcase
          title={sections.readyToWear.title}
          circles={sections.readyToWear.circles}
          viewAllHref={sections.readyToWear.viewAllHref}
          showDivider={!editorialSpotlight}
          variant="white"
        />
      )}

      {sections.accessories?.show && (
        <FashionCircleShowcase
          title={sections.accessories.title}
          circles={sections.accessories.circles}
          viewAllHref={sections.accessories.viewAllHref}
          showDivider
          variant="muted"
        />
      )}

      {sections.newArrivals?.show && (
        <NewArrivalsRail
          title={sections.newArrivals.title}
          products={sections.newArrivals.products}
          catalogPool={sections.newArrivals.catalogPool}
          businessDomain={businessDomain}
          viewAllHref={sections.newArrivals.viewAllHref}
        />
      )}
    </>
  );
}
