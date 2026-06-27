'use client';

import { normalizeProseCopy } from '@/lib/utils/copyTypography';

/**
 * Renders user-facing copy with em/en dashes normalized.
 * Use for marketing lines, descriptions, and dynamic assistant text.
 */
export function CopyText({ children, as: Tag = 'span', className, ...props }) {
  const content =
    typeof children === 'string' ? normalizeProseCopy(children) : children;

  return (
    <Tag className={className} {...props}>
      {content}
    </Tag>
  );
}
