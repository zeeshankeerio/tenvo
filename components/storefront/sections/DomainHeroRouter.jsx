'use client';

import { PartsFinderHero } from './heroes/PartsFinderHero';
import {
  PharmacyFinderHero,
  FashionFinderHero,
  GroceryFinderHero,
  RestaurantFinderHero,
} from './heroes/CommerceFinderHero';
import { CommerceCarouselHero } from './heroes/CommerceCarouselHero';
import { FashionEditorialHero } from './heroes/FashionEditorialHero';
import { DealershipHero } from './dealership/DealershipHero';
import { MarketplaceHero } from './marketplace/MarketplaceHero';
import { PharmacyHero } from './pharmacy/PharmacyHero';
import { FurnitureHero } from './furniture/FurnitureHero';
import { RestaurantHero } from './restaurant/RestaurantHero';

/**
 * Renders the domain-appropriate immersive hero (parts finder, pharmacy, fashion, etc.).
 * @param {{ preset: object; businessDomain: string; accent: string; accentDark: string }} props
 */
export function DomainHeroRouter({ preset, businessDomain, accent, accentDark }) {
  if (!preset?.type) return null;

  switch (preset.type) {
    case 'parts-finder':
      return (
        <PartsFinderHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
        />
      );
    case 'pharmacy-finder':
      return (
        <PharmacyFinderHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
        />
      );
    case 'pharmacy-elevated':
      return (
        <PharmacyHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
          contactCity={preset.contactCity}
        />
      );
    case 'furniture-elevated':
      return (
        <FurnitureHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
          contactCity={preset.contactCity}
        />
      );
    case 'restaurant-elevated':
      return (
        <RestaurantHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
          contactCity={preset.contactCity}
        />
      );
    case 'fashion-editorial':
      return (
        <FashionEditorialHero
          preset={preset}
          accent={accent}
        />
      );
    case 'auto-dealership':
      return (
        <DealershipHero
          preset={preset}
          accent={accent}
        />
      );
    case 'auto-marketplace':
      return (
        <MarketplaceHero
          preset={preset}
          accent={accent}
          accentDark={accentDark}
          settings={preset.settings}
        />
      );
    case 'fashion-finder':
      return (
        <FashionFinderHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
        />
      );
    case 'grocery-finder':
      return (
        <GroceryFinderHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
        />
      );
    case 'restaurant-finder':
      return (
        <RestaurantFinderHero
          preset={preset}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
        />
      );
    case 'commerce-carousel':
    default:
      return (
        <CommerceCarouselHero
          preset={preset}
          accent={accent}
          accentDark={accentDark}
        />
      );
  }
}
