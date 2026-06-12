# Regional standards (multi-country)

Business registration and `createBusiness` resolve **country → currency, time zone, tax labels, default VAT/GST rate, locale, and tax ID naming** from a single registry: `lib/utils/regionalHelpers.ts`.

## Defaults

- **Empty / unknown** country input normalizes to **Pakistan (`PK`)** for backward compatibility with existing flows.
- **Database `businesses.country`** stores the **canonical English country name** (e.g. `Pakistan`, `United States`) for storefronts and admin UI.
- **Wizard and APIs** may send **ISO 3166-1 alpha-2** codes (e.g. `PK`, `US`); aliases (e.g. `UAE`, `United Kingdom`) are accepted.

## Adding a new country

1. Ensure the **operating currency** exists in `lib/currency/index.ts` (`CURRENCY_CONFIG`). Add the currency first if needed.
2. Add a row to **`REGIONAL_REGISTRY`** in `regionalHelpers.ts` with accurate `timeZone` (IANA), `defaultTaxRate` (indicative only - not legal advice), and `taxIdLabel`.
3. Add any **aliases** (full country name, major cities) to **`ALIAS_TO_ISO`** so free-text and legacy data resolve correctly.

`getRegistrationCountryOptions()` is derived from the registry, so the register wizard updates automatically.

## Persisted metadata

On signup, `business_settings.settings.registration` includes `country_iso`, `tax_label`, `default_tax_rate`, `tax_strategy`, `locale`, and `time_zone` for downstream features. Storefront defaults also receive `countryIso` and `locale` under `settings.storefront` where applicable.

## Plan pricing display

Pakistan + PKR shows **list prices in PKR** from `PLAN_TIERS.*.price_pkr`. Other regions show **USD reference prices** from `price_usd` with a short footnote (billing rules remain product-specific).
