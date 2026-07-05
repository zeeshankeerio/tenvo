'use client';

import dynamic from 'next/dynamic';

const DealershipHomeSections = dynamic(() =>
  import('./dealership/DealershipHomeSections').then((m) => ({ default: m.DealershipHomeSections }))
);
const MarketplaceHomeSections = dynamic(() =>
  import('./marketplace/MarketplaceHomeSections').then((m) => ({ default: m.MarketplaceHomeSections }))
);
const AutoPartsHomeSections = dynamic(() =>
  import('./autoparts/AutoPartsHomeSections').then((m) => ({ default: m.AutoPartsHomeSections }))
);
const PharmacyHomeSections = dynamic(() =>
  import('./pharmacy/PharmacyHomeSections').then((m) => ({ default: m.PharmacyHomeSections }))
);
const FurnitureHomeSections = dynamic(() =>
  import('./furniture/FurnitureHomeSections').then((m) => ({ default: m.FurnitureHomeSections }))
);
const RestaurantHomeSections = dynamic(() =>
  import('./restaurant/RestaurantHomeSections').then((m) => ({ default: m.RestaurantHomeSections }))
);
const FitnessHomeSections = dynamic(() =>
  import('./fitness/FitnessHomeSections').then((m) => ({ default: m.FitnessHomeSections }))
);

/**
 * Code-split elevated vertical homepage sections (only the active vertical chunk loads).
 */
export function LazyVerticalHomeSections({ variant, ...props }) {
  switch (variant) {
    case 'dealership':
      return <DealershipHomeSections {...props} />;
    case 'marketplace':
      return <MarketplaceHomeSections {...props} />;
    case 'auto-parts':
      return <AutoPartsHomeSections {...props} />;
    case 'pharmacy':
      return <PharmacyHomeSections {...props} />;
    case 'furniture':
      return <FurnitureHomeSections {...props} />;
    case 'restaurant':
      return <RestaurantHomeSections {...props} />;
    case 'fitness':
      return <FitnessHomeSections {...props} />;
    default:
      return null;
  }
}
