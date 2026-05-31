'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

/**
 * FeaturesGrid Component
 * 
 * Displays features in a responsive grid layout with hover effects.
 * Supports both card and list variants.
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Section subtitle
 * @param {Array} props.features - Array of feature objects
 * @param {number} props.columns - Number of columns on desktop (2, 3, or 4)
 * @param {string} props.variant - Layout variant: 'cards' | 'list' | 'grid' (alias of cards)
 */
export default function FeaturesGrid({
  title,
  subtitle,
  features = [],
  columns = 3,
  variant = 'cards'
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine grid columns class based on columns prop
  const getGridClass = () => {
    const columnMap = {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-2 lg:grid-cols-3',
      4: 'md:grid-cols-2 lg:grid-cols-4'
    };
    return columnMap[columns] || columnMap[3];
  };

  // Card variant ('grid' is treated as the same responsive card grid)
  if (variant === 'cards' || variant === 'grid') {
    return (
      <section className="py-16 lg:py-24 bg-neutral-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Features grid */}
          <div className={`grid grid-cols-1 ${getGridClass()} gap-8`}>
            {features.map((feature, index) => {
              const FeatureIcon = feature.icon ? LucideIcons[feature.icon] : null;
              
              return (
                <div
                  key={feature.id}
                  className={`group relative bg-white rounded-2xl p-8 border border-neutral-200 hover:border-brand-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Icon */}
                  {FeatureIcon && (
                    <div className="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-primary transition-colors duration-300">
                      <FeatureIcon className="w-7 h-7 text-brand-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-neutral-600 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Link */}
                  {feature.link && (
                    <Link
                      href={feature.link}
                      className="inline-flex items-center gap-2 text-brand-primary font-semibold hover:gap-3 transition-all duration-300"
                    >
                      <span>Learn more</span>
                      <LucideIcons.ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Features list */}
          <div className="max-w-4xl mx-auto space-y-6">
            {features.map((feature, index) => {
              const FeatureIcon = feature.icon ? LucideIcons[feature.icon] : null;
              
              return (
                <div
                  key={feature.id}
                  className={`group flex gap-6 p-6 bg-neutral-50 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Icon */}
                  {FeatureIcon && (
                    <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-primary transition-colors duration-300">
                      <FeatureIcon className="w-6 h-6 text-brand-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                  )}

                  <div className="flex-1">
                    {/* Title */}
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-neutral-600 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Link */}
                    {feature.link && (
                      <Link
                        href={feature.link}
                        className="inline-flex items-center gap-2 text-brand-primary font-semibold mt-3 hover:gap-3 transition-all duration-300"
                      >
                        <span>Learn more</span>
                        <LucideIcons.ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
