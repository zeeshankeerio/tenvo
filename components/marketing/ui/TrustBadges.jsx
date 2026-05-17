'use client';

import { useState } from 'react';

/**
 * TrustBadges Component
 * Displays compliance and certification badges with tooltips
 */
export function TrustBadges({ variant = 'horizontal', className = '' }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const badges = [
    {
      id: 'fbr',
      name: 'FBR Compliant',
      icon: '🏛️',
      description: 'Fully compliant with Federal Board of Revenue regulations for tax reporting and invoicing',
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      id: 'secp',
      name: 'SECP Certified',
      icon: '✓',
      description: 'Certified by Securities and Exchange Commission of Pakistan for financial compliance',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'iso',
      name: 'ISO 27001',
      icon: '🔒',
      description: 'ISO 27001 certified for information security management',
      color: 'bg-wine-50 text-wine-700 border-wine-200'
    },
    {
      id: 'gdpr',
      name: 'GDPR Ready',
      icon: '[SHIELD]',
      description: 'GDPR compliant data protection and privacy controls',
      color: 'bg-gray-50 text-gray-700 border-gray-200'
    }
  ];

  const handleMouseEnter = (badgeId) => {
    setActiveTooltip(badgeId);
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  const handleKeyDown = (e, badgeId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTooltip(activeTooltip === badgeId ? null : badgeId);
    } else if (e.key === 'Escape') {
      setActiveTooltip(null);
    }
  };

  const layoutClass = variant === 'vertical' 
    ? 'flex flex-col gap-3' 
    : 'flex flex-wrap gap-3 justify-center items-center';

  return (
    <div className={`${layoutClass} ${className}`} role="list">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="relative"
          role="listitem"
        >
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 
              transition-all duration-200 cursor-help
              ${badge.color}
              ${activeTooltip === badge.id ? 'scale-105 shadow-md' : 'hover:scale-105 hover:shadow-md'}
            `}
            onMouseEnter={() => handleMouseEnter(badge.id)}
            onMouseLeave={handleMouseLeave}
            onFocus={() => handleMouseEnter(badge.id)}
            onBlur={handleMouseLeave}
            onKeyDown={(e) => handleKeyDown(e, badge.id)}
            tabIndex={0}
            role="button"
            aria-label={`${badge.name} - ${badge.description}`}
            aria-expanded={activeTooltip === badge.id}
          >
            <span className="text-xl" aria-hidden="true">{badge.icon}</span>
            <span className="font-semibold text-sm whitespace-nowrap">{badge.name}</span>
          </div>

          {/* Tooltip */}
          {activeTooltip === badge.id && (
            <div
              className="absolute z-50 w-64 p-3 mt-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl"
              style={{
                left: '50%',
                transform: 'translateX(-50%)'
              }}
              role="tooltip"
            >
              <p>{badge.description}</p>
              <div
                className="absolute w-3 h-3 bg-gray-900 transform rotate-45"
                style={{
                  top: '-6px',
                  left: '50%',
                  marginLeft: '-6px'
                }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
