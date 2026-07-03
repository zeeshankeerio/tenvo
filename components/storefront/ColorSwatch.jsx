'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Color mapping for common clothing and product colors
 * Supports both English and localized color names
 */
const COLOR_MAP = {
  // Basic colors
  'red': '#EF4444',
  'blue': '#3B82F6',
  'green': '#10B981',
  'yellow': '#F59E0B',
  'purple': '#A855F7',
  'pink': '#EC4899',
  'black': '#000000',
  'white': '#FFFFFF',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'brown': '#92400E',
  'orange': '#F97316',
  'navy': '#1E3A8A',
  'beige': '#D2B48C',
  'maroon': '#7F1D1D',
  'olive': '#84CC16',
  'sky-blue': '#87CEEB',
  'royal-blue': '#4169E1',
  'rust': '#B7410E',
  
  // Clothing specific colors
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  'khaki': '#C3B091',
  'tan': '#D2B48C',
  'charcoal': '#36454F',
  'wine': '#722F37',
  'mustard': '#FFDB58',
  'teal': '#14B8A6',
  'coral': '#FF7F50',
  'lavender': '#E6E6FA',
  'mint': '#98FF98',
  'peach': '#FFE5B4',
  'salmon': '#FA8072',
  'turquoise': '#40E0D0',
  'indigo': '#4B0082',
  'crimson': '#DC143C',
  'emerald': '#50C878',
  'ruby': '#E0115F',
  'sapphire': '#0F52BA',
  'gold': '#FFD700',
  'silver': '#C0C0C0',
  
  // Pakistani clothing colors (Urdu transliteration)
  'safed': '#FFFFFF',      // سفید (white)
  'kala': '#000000',       // کالا (black)
  'lal': '#EF4444',        // لال (red)
  'neela': '#3B82F6',      // نیلا (blue)
  'hara': '#10B981',       // ہرا (green)
  'peela': '#F59E0B',      // پیلا (yellow)
  'gulabi': '#EC4899',     // گلابی (pink)
  'jamni': '#A855F7',      // جامنی (purple)
  'bhura': '#92400E',      // بھورا (brown)
  'ferozi': '#14B8A6',     // فیروزی (turquoise)
  
  // Multi-color / Print
  'multicolor': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'multi': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'print': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'floral': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'striped': 'repeating-linear-gradient(45deg, #606dbc, #606dbc 10px, #465298 10px, #465298 20px)',
};

/**
 * Normalize color name for consistent matching
 */
function normalizeColorName(colorName) {
  return String(colorName || '').toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * ColorSwatch Component
 * Visual color selector for product variants (e.g., clothing colors)
 * 
 * @param {string} color - Color name or hex value
 * @param {boolean} isSelected - Whether this color is currently selected
 * @param {boolean} isAvailable - Whether this color variant is in stock
 * @param {function} onClick - Handler when color is clicked
 * @param {'sm'|'md'|'lg'} size - Size of the swatch
 * @param {boolean} showLabel - Whether to show color name below swatch
 */
export function ColorSwatch({ 
  color, 
  isSelected, 
  isAvailable = true, 
  onClick,
  size = 'md',
  showLabel = false,
}) {
  const normalizedColor = normalizeColorName(color);
  const hexColor = COLOR_MAP[normalizedColor];
  
  // If color not in map, try to use it directly (could be hex or CSS color)
  const colorValue = hexColor || color;
  
  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const checkSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };
  
  // Determine if color is light (for check mark contrast)
  const isLightColor = ['white', 'cream', 'ivory', 'beige', 'yellow', 'peach', 'mint', 'lavender', 'safed'].includes(normalizedColor);
  
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={!isAvailable}
        className={cn(
          "relative rounded-full border-2 transition-all flex items-center justify-center",
          sizeClasses[size],
          !isAvailable && "opacity-30 cursor-not-allowed",
          isAvailable && !isSelected && "border-gray-300 hover:border-gray-400 hover:scale-110",
          isSelected && "border-gray-900 ring-2 ring-offset-2 ring-gray-900 scale-110 shadow-lg"
        )}
        title={color}
        aria-label={`Select ${color}`}
        aria-pressed={isSelected}
      >
        {/* Color circle */}
        <div
          className={cn(
            "w-full h-full rounded-full",
            isLightColor && "border border-gray-200"
          )}
          style={{
            background: colorValue,
          }}
        />
        
        {/* Selected check mark */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "rounded-full flex items-center justify-center",
              size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5',
              isLightColor ? "bg-gray-900" : "bg-white shadow-md"
            )}>
              <Check
                className={cn(
                  checkSizes[size],
                  isLightColor ? "text-white" : "text-gray-900"
                )}
                strokeWidth={3}
              />
            </div>
          </div>
        )}
        
        {/* Unavailable strike-through */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full bg-red-500 rotate-45 shadow-sm" />
          </div>
        )}
      </button>
      
      {/* Optional label */}
      {showLabel && (
        <span className={cn(
          "text-xs text-center capitalize max-w-[60px] line-clamp-1",
          isSelected ? "font-semibold text-gray-900" : "text-gray-600",
          !isAvailable && "line-through text-gray-400"
        )}>
          {color}
        </span>
      )}
    </div>
  );
}

/**
 * Check if an attribute is a color-type attribute
 * @param {string} attributeName 
 * @returns {boolean}
 */
export function isColorAttribute(attributeName) {
  if (!attributeName) return false;
  const normalized = String(attributeName).toLowerCase();
  return ['color', 'colour', 'rang', 'رنگ'].includes(normalized);
}

/**
 * ColorSwatchGroup Component
 * Group of color swatches with automatic wrapping
 */
export function ColorSwatchGroup({ children, label }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="font-medium text-sm text-gray-900">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        {children}
      </div>
    </div>
  );
}
