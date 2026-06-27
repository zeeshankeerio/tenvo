'use client';

import { cn } from '@/lib/utils';

/**
 * Lightweight layered card — CSS-only hover (no layout-thrashing height:auto).
 * Parent must include `group` for expand / lift effects.
 */
export default function ThreeDLayeredCard({
  logo,
  mainImage,
  title,
  logoSize = 72,
  backgroundColor = 'bg-gradient-to-b from-purple-500 to-blue-600',
  textColor = 'white',
  glowColor = 'rgba(168, 85, 247, 0.2)',
  glowGradient = '#a855f7',
  children,
  className,
  ...rest
}) {
  return (
    <div
      className={cn('relative w-full select-none pt-9', className)}
      style={{
        '--card-glow': glowColor,
        '--card-accent': glowGradient,
        '--card-logo': `${logoSize}px`,
      }}
      {...rest}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-white/15',
          'h-40 motion-safe:group-hover:h-[19rem]',
          'motion-safe:transition-[height,transform,box-shadow] motion-safe:duration-300 motion-safe:ease-out',
          'motion-safe:group-hover:-translate-y-1',
          'shadow-[0_12px_28px_-14px_var(--card-glow)]',
          'motion-safe:group-hover:shadow-[0_18px_36px_-12px_var(--card-glow)]',
          backgroundColor
        )}
      >
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" aria-hidden />

        <div
          className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-xl border-2 border-white/30 bg-white shadow-md ring-2 ring-black/5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5"
          style={{
            top: 'calc(var(--card-logo) * -0.42)',
            width: 'var(--card-logo)',
            height: 'var(--card-logo)',
          }}
        >
          {typeof logo === 'string' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-full w-full object-contain p-2"
              loading="lazy"
              decoding="async"
            />
          ) : (
            logo
          )}
        </div>

        <div
          className="relative z-10 flex h-full flex-col justify-end p-4 pt-10 sm:p-5"
          style={{ color: textColor }}
        >
          <p className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</p>

          <div
            className={cn(
              'overflow-hidden motion-safe:transition-[max-height,opacity,margin] motion-safe:duration-300 motion-safe:ease-out',
              'max-h-0 opacity-0',
              'motion-safe:group-hover:mt-2.5 motion-safe:group-hover:max-h-52 motion-safe:group-hover:opacity-100',
              'motion-reduce:mt-2.5 motion-reduce:max-h-52 motion-reduce:opacity-100'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
