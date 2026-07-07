import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { guardStorefrontBusiness } from '@/lib/storefront/guardStorefrontBusiness';
import { ContactPageClient } from '@/components/storefront/ContactPageClient';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Contact' };
  return {
    title: `Contact | ${result.business.business_name}`,
    description: `Get in touch with ${result.business.business_name}. Order help, product questions, and support.`,
  };
}

export default async function ContactPage({ params }) {
  const { businessDomain } = await params;
  const result = guardStorefrontBusiness(await fetchBusinessByDomain(businessDomain));
  if (!result) return null;

  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <ContactPageClient />
    </Suspense>
  );
}
