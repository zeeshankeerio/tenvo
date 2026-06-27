import type { JsonLdObject } from '@/lib/marketing/structured-data';

type MarketingJsonLdProps = {
  schemas: readonly JsonLdObject[];
};

/**
 * Inject JSON-LD schemas in marketing route layouts.
 */
export function MarketingJsonLd({ schemas }: MarketingJsonLdProps) {
  if (!schemas.length) return null;

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={schema['@id'] || schema['@type'] || String(index)}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
