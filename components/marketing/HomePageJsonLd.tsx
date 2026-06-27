import { HOME_PAGE_FAQS } from '@/lib/marketing/seo';
import { getFAQSchema, getHomeWebPageSchema } from '@/lib/marketing/structured-data';

/** Homepage-only JSON-LD (WebPage + FAQ matching visible accordion). */
export function HomePageJsonLd() {
  const webPage = getHomeWebPageSchema();
  const faq = getFAQSchema(HOME_PAGE_FAQS);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
