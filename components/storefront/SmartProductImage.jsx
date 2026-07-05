'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { resolveBrandMonogramUrl } from '@/lib/storefront/storefrontImagePlaceholders';
import { isDeadImageUrl } from '@/lib/storefront/deadImageHosts';
import { normalizeStorefrontRemoteImageUrl } from '@/lib/storefront/productImageFallback';
import {
  inferImageVariantFromWidth,
  resolveStorefrontImageSrc,
  shouldUseDirectCdnImage,
  buildSupabaseObjectPublicUrl,
} from '@/lib/storefront/supabaseImageUrl';

/**
 * Renders storefront product imagery.
 * Supabase URLs use CDN transforms (plain img); other HTTPS uses next/image.
 */
export function SmartProductImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  style,
  priority,
  fallbackSrc,
  placeholderLabel,
  imageVariant,
}) {
  const safeSrc = isDeadImageUrl(src)
    ? ''
    : normalizeStorefrontRemoteImageUrl(src || '');
  const [currentSrc, setCurrentSrc] = useState(safeSrc);
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [useObjectPublicFallback, setUseObjectPublicFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(safeSrc);
    setFailed(false);
    setFallbackFailed(false);
    setUseObjectPublicFallback(false);
  }, [safeSrc]);

  const activeSrc = failed && fallbackSrc && !fallbackFailed ? fallbackSrc : currentSrc;
  const monogramSrc =
    placeholderLabel && !activeSrc
      ? resolveBrandMonogramUrl(placeholderLabel)
      : '';

  const handleError = () => {
    if (
      shouldUseDirectCdnImage(currentSrc) &&
      !useObjectPublicFallback &&
      !failed
    ) {
      setUseObjectPublicFallback(true);
      return;
    }
    if (fallbackSrc && !failed) {
      setFailed(true);
      return;
    }
    if (fallbackSrc && failed && !fallbackFailed) {
      setFallbackFailed(true);
      setCurrentSrc('');
      return;
    }
    setCurrentSrc('');
  };

  if (!activeSrc && !monogramSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-neutral-100 text-neutral-400',
          fill && 'absolute inset-0 h-full w-full',
          className
        )}
        style={style}
        aria-hidden={!alt}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {(placeholderLabel || alt || 'Image').slice(0, 3)}
        </span>
      </div>
    );
  }

  const renderSrc = activeSrc || monogramSrc;
  const isDataUrl = renderSrc.startsWith('data:');
  const isSvg = /\.svg(\?|$)/i.test(renderSrc);

  if (isDataUrl || isSvg) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={renderSrc}
          alt={alt || ''}
          className={cn('absolute inset-0 h-full w-full object-cover', className)}
          style={style}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={renderSrc}
        alt={alt || ''}
        width={width}
        height={height}
        className={cn('object-cover', className)}
        style={style}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  const variant =
    imageVariant || inferImageVariantFromWidth(width || (fill ? 512 : undefined));
  const cdnSrc = useObjectPublicFallback
    ? buildSupabaseObjectPublicUrl(renderSrc)
    : resolveStorefrontImageSrc(renderSrc, { variant });
  const useDirectCdn = shouldUseDirectCdnImage(renderSrc);

  if (useDirectCdn) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cdnSrc}
          alt={alt || ''}
          className={cn('absolute inset-0 h-full w-full object-cover', className)}
          style={style}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cdnSrc}
        alt={alt || ''}
        width={width || 400}
        height={height || 400}
        className={cn('object-cover', className)}
        style={style}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={renderSrc}
        alt={alt || ''}
        fill
        className={className}
        sizes={sizes || '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
        style={style}
        priority={priority}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={renderSrc}
      alt={alt || ''}
      width={width || 400}
      height={height || 400}
      className={className}
      sizes={sizes}
      style={style}
      priority={priority}
      onError={handleError}
    />
  );
}
