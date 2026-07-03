# Tailwind Animation Configuration

Add these to your `tailwind.config.js` to enable all the modern effects:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      // === ANIMATION TIMINGS ===
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      
      // === ANIMATION DURATIONS ===
      transitionDuration: {
        '0': '0ms',
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
      },
      
      // === KEYFRAME ANIMATIONS ===
      keyframes: {
        // Fade & Slide
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        
        // Scale
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in-center': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        
        // Floating
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        
        // Gradient Animations
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'gradient-y': {
          '0%, 100%': { backgroundPosition: '50% 0%' },
          '50%': { backgroundPosition: '50% 100%' },
        },
        'gradient-xy': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '25%': { backgroundPosition: '100% 50%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
        },
        
        // Shimmer
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        
        // Pulse
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-fast': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        
        // Wiggle
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        
        // Bounce variants
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5%)' },
        },
        
        // Spin variants
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'spin-slower': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        
        // Marquee
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        
        // Scroll indicator
        'scroll-dot': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(12px)', opacity: '0' },
        },
        
        // Mesh background drift
        'mesh-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(1.5%, -1%, 0) scale(1.02)' },
        },
        
        // Accordion
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      
      // === ANIMATION CLASSES ===
      animation: {
        // Fade & Slide
        'fade-in': 'fade-in 0.6s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in-down': 'fade-in-down 0.6s ease-out',
        'fade-in-left': 'fade-in-left 0.6s ease-out',
        'fade-in-right': 'fade-in-right 0.6s ease-out',
        
        // Scale
        'scale-in': 'scale-in 0.5s ease-out',
        'scale-in-center': 'scale-in-center 0.4s ease-out',
        
        // Floating
        'float-gentle': 'float-gentle 6s ease-in-out infinite',
        'float-gentle-delayed': 'float-gentle 6s ease-in-out 1.5s infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        
        // Gradient
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 20s ease infinite',
        
        // Shimmer
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-slow': 'shimmer 3s linear infinite',
        
        // Pulse
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'pulse-fast': 'pulse-fast 1s ease-in-out infinite',
        
        // Others
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'spin-slower': 'spin-slower 5s linear infinite',
        
        // Marquee
        'marquee': 'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 30s linear infinite',
        
        // Specific effects
        'scroll-dot': 'scroll-dot 1.5s ease-in-out infinite',
        'mesh-drift': 'mesh-drift 18s ease-in-out infinite',
        
        // Accordion
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      
      // === BLUR UTILITIES ===
      blur: {
        xs: '2px',
        '3xl': '64px',
        '4xl': '96px',
      },
      
      // === BOX SHADOWS ===
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'brand': '0 4px 14px -2px rgba(210, 43, 43, 0.28)',
        'brand-lg': '0 8px 24px -4px rgba(210, 43, 43, 0.32)',
        'glow-sm': '0 0 10px rgba(210, 43, 43, 0.2)',
        'glow': '0 0 20px rgba(210, 43, 43, 0.3)',
        'glow-lg': '0 0 40px rgba(210, 43, 43, 0.4)',
      },
      
      // === BACKDROP BLUR ===
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
    },
  },
  
  // === PLUGINS ===
  plugins: [
    // Add custom animation utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Will-change utilities for performance
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.will-change-opacity': {
          'will-change': 'opacity',
        },
        '.will-change-transform-opacity': {
          'will-change': 'transform, opacity',
        },
        '.will-change-auto': {
          'will-change': 'auto',
        },
        
        // Perspective utilities for 3D effects
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.perspective-1500': {
          perspective: '1500px',
        },
        '.perspective-2000': {
          perspective: '2000px',
        },
        
        // Transform style
        '.transform-3d': {
          'transform-style': 'preserve-3d',
        },
        
        // Backface visibility
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        
        // Hardware acceleration
        '.gpu': {
          transform: 'translateZ(0)',
          'will-change': 'transform',
        },
        
        // Smooth scrolling
        '.scroll-smooth': {
          'scroll-behavior': 'smooth',
        },
        
        // Text rendering
        '.text-optimize': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
          'text-rendering': 'optimizeLegibility',
        },
        
        // Animation delays
        '.animation-delay-100': {
          'animation-delay': '100ms',
        },
        '.animation-delay-200': {
          'animation-delay': '200ms',
        },
        '.animation-delay-300': {
          'animation-delay': '300ms',
        },
        '.animation-delay-500': {
          'animation-delay': '500ms',
        },
        '.animation-delay-1000': {
          'animation-delay': '1000ms',
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
};
```

---

## Usage Examples

### 1. Fade In Animations
```jsx
// Fade in on page load
<div className="animate-fade-in">Content</div>

// Fade in from bottom with delay
<div className="animate-fade-in-up animation-delay-200">Content</div>

// Fade in from sides
<div className="animate-fade-in-left">Left content</div>
<div className="animate-fade-in-right">Right content</div>
```

### 2. Hover Effects with Smooth Timing
```jsx
<button className="
  transition-all duration-300 ease-smooth
  hover:scale-105 hover:shadow-brand-lg
  active:scale-100
">
  Button
</button>
```

### 3. Gradient Background Animation
```jsx
<div className="
  bg-gradient-to-r from-brand-primary via-brand-primary-light to-brand-primary
  bg-[length:200%_auto]
  animate-gradient-x
">
  Animated gradient
</div>
```

### 4. Loading Shimmer
```jsx
<div className="
  h-8 w-full rounded-lg
  bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200
  bg-[length:200%_100%]
  animate-shimmer
" />
```

### 5. Floating Elements
```jsx
<div className="animate-float-gentle">
  <Icon />
</div>

<div className="animate-float-gentle-delayed">
  <Icon />
</div>
```

### 6. Performance-Optimized Cards
```jsx
<div className="
  will-change-transform gpu
  transition-transform duration-300 ease-bounce-soft
  hover:translate-y-[-4px] hover:shadow-strong
">
  Card content
</div>
```

### 7. 3D Card Tilt (Advanced)
```jsx
<div className="perspective-1000">
  <div className="
    transform-3d backface-hidden
    transition-transform duration-300
    hover:rotate-y-3
  ">
    Card
  </div>
</div>
```

### 8. Staggered List Items
```jsx
{items.map((item, i) => (
  <div 
    key={i}
    className="animate-fade-in-up"
    style={{ animationDelay: `${i * 100}ms` }}
  >
    {item}
  </div>
))}
```

---

## Accessibility: Respecting Reduced Motion

Add this to your global CSS or component:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Or use Tailwind's built-in `motion-safe:` and `motion-reduce:` variants:

```jsx
<div className="
  motion-safe:animate-fade-in-up
  motion-reduce:opacity-100
">
  Content
</div>
```

---

## Performance Tips

### 1. Use GPU-Accelerated Properties
✅ **Good:**
```jsx
className="transform translate-y-2 opacity-80"
```

❌ **Bad:**
```jsx
className="mt-2" // Animating margin causes layout recalculation
```

### 2. Add `will-change` Selectively
```jsx
// Only when animating
<div className="will-change-transform hover:scale-105">...</div>

// Remove after animation
<div 
  className={isAnimating ? 'will-change-transform' : ''}
  onAnimationEnd={() => setIsAnimating(false)}
>
```

### 3. Use CSS Variables for Dynamic Delays
```jsx
{items.map((item, i) => (
  <div 
    key={i}
    className="animate-fade-in-up"
    style={{ '--animation-delay': `${i * 100}ms` }}
  >
    {item}
  </div>
))}
```

```css
.animate-fade-in-up {
  animation-delay: var(--animation-delay, 0ms);
}
```

---

## Testing Checklist

- [ ] Test all animations at 60fps (Chrome DevTools Performance)
- [ ] Verify reduced-motion behavior
- [ ] Check mobile performance (throttle CPU 4x)
- [ ] Test on Safari (webkit prefixes)
- [ ] Validate no layout shifts (CLS < 0.1)
- [ ] Check animation smoothness on low-end devices

---

## Additional Resources

- [Web.dev - Animations Guide](https://web.dev/animations/)
- [MDN - CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Cubic-bezier.com](https://cubic-bezier.com/) - Easing function generator
- [Tailwind Animation Cheatsheet](https://nerdcave.com/tailwind-cheat-sheet)
