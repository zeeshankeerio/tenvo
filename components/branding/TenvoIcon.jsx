import { cn } from '@/lib/utils';
import { TENVO_LOGO_ALT, TENVO_LOGO_SRC } from '@/lib/branding/tenvoBrand';

/**
 * TENVO brand mark from public/tenvo.svg, use everywhere instead of a letter "T" tile.
 */
export function TenvoIcon({
  size = 36,
  className,
  alt = TENVO_LOGO_ALT,
  priority = false,
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TENVO_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('object-contain', className)}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' } : {})}
    />
  );
}
