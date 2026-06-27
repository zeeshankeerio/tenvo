import {
  getOrganizationSchema,
  getSoftwareApplicationSchema,
  getWebSiteSchema,
  type JsonLdObject,
} from '@/lib/marketing/structured-data';

function jsonLdKey(schema: JsonLdObject, index: number): string {
  return schema['@id'] || schema['@type'] || String(index);
}

/** Global JSON-LD: Organization + WebSite + SoftwareApplication (every public page). */
export function DefaultJsonLd() {
  const schemas: JsonLdObject[] = [
    getOrganizationSchema(),
    getWebSiteSchema(),
    getSoftwareApplicationSchema(),
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={jsonLdKey(schema, index)}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
