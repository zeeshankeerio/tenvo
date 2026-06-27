import HomePage from './HomePage';
import { HomePageJsonLd } from '@/components/marketing/HomePageJsonLd';
import { getRootMarketingMetadata } from '@/lib/marketing/seo';

export const metadata = getRootMarketingMetadata();

export default function Page() {
  return (
    <>
      <HomePageJsonLd />
      <HomePage />
    </>
  );
}
