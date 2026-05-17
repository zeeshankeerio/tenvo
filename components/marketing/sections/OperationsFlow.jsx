'use client';

import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * OperationsFlow Component
 * 
 * Displays the 3-step operational flow: Capture -> Operate -> Control
 * Shows how the system works in a clear, visual manner.
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Section subtitle
 * @param {Array} props.steps - Array of step objects with icon, title, description
 */
export default function OperationsFlow({
  title,
  subtitle,
  steps = []
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
            {title}
          </h2>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const StepIcon = step.icon ? LucideIcons[step.icon] : null;
            
            return (
              <div
                key={step.id}
                className={`relative ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Connector line (hidden on mobile, shown on desktop between steps) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-wine-300 to-wine-100 -translate-x-1/2 z-0" />
                )}

                <div className="relative bg-white rounded-2xl p-8 border-2 border-neutral-200 hover:border-wine-300 hover:shadow-xl transition-all duration-300 group">
                  {/* Step number badge */}
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-wine-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  {StepIcon && (
                    <div className="w-16 h-16 bg-wine-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-wine-100 transition-colors duration-300">
                      <StepIcon className="w-8 h-8 text-wine-600" />
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-neutral-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom decorative element */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <LucideIcons.ArrowRight className="w-4 h-4" />
            <span>Seamless integration across all steps</span>
          </div>
        </div>
      </div>
    </section>
  );
}
