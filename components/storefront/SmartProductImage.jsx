import Image from 'next/image';

/**
 * SmartProductImage
 *
 * Renders a Next.js <Image> for real https:// URLs (with optimisation)
 * or a plain <img> for data: base64 URIs (Next/Image can't optimise those).
 *
 * Props mirror Next.js Image props: src, alt, fill, width, height, className, sizes
 */
export function SmartProductImage({ src, alt, fill, width, height, className, sizes, style, priority }) {
  if (!src) return null;

  const isDataUrl = src.startsWith('data:');

  if (isDataUrl) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full ${className || ''}`}
          style={{ objectFit: 'cover', ...style }}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'cover', ...style }}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes || '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
        style={style}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 400}
      height={height || 400}
      className={className}
      sizes={sizes}
      style={style}
      priority={priority}
    />
  );
}
