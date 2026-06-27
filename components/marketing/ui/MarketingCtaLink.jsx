'use client';

import Link from 'next/link';
import { isExternalHref } from '@/lib/marketing/salesLinks';

/**
 * Renders Next.js Link for internal routes or a new-tab anchor for external sales URLs.
 */
export default function MarketingCtaLink({ href, className, children, onClick, ...rest }) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href || '#'} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
