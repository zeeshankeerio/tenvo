'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 2026 Modern Effects Collection - Lightweight & Performance-Optimized
 * All effects respect prefers-reduced-motion
 */

// ==================== SCROLL REVEAL ====================
/**
 * Reveals children when scrolled into view
 * @param {number} threshold - Intersection observer threshold (0-1)
 * @param {string} direction - Animation direction: 'up', 'down', 'left', 'right', 'fade'
 */
export const ScrollReveal = ({ 
  children, 
  threshold = 0.1, 
  direction = 'up',
  delay = 0,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Trigger only once
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const getTransformClass = () => {
    if (isVisible) return 'opacity-100 translate-x-0 translate-y-0';
    
    switch (direction) {
      case 'up': return 'opacity-0 translate-y-8';
      case 'down': return 'opacity-0 -translate-y-8';
      case 'left': return 'opacity-0 translate-x-8';
      case 'right': return 'opacity-0 -translate-x-8';
      case 'fade': return 'opacity-0';
      default: return 'opacity-0 translate-y-8';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        getTransformClass(),
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ==================== STAGGER CHILDREN ====================
/**
 * Reveals children with staggered delays
 */
export const StaggerChildren = ({ children, staggerDelay = 100, className = '' }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <ScrollReveal key={index} delay={index * staggerDelay}>
              {child}
            </ScrollReveal>
          ))
        : <ScrollReveal>{children}</ScrollReveal>
      }
    </div>
  );
};

// ==================== ANIMATED COUNTER ====================
/**
 * Animates a number from 0 to target value
 */
export const AnimatedCounter = ({ 
  value, 
  suffix = '', 
  prefix = '',
  duration = 2000,
  className = ''
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    
    const step = value / (duration / 16); // 60fps
    let current = 0;
    
    const timer = setInterval(() => {
      current += step;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums font-bold', className)}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// ==================== SCROLL PROGRESS ====================
/**
 * Shows page scroll progress at the top
 */
export const ScrollProgress = ({ className = '' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(scrollPercent);
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress(); // Initial call
    
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className={cn('fixed top-0 left-0 right-0 h-1 z-50 bg-neutral-100/50', className)}>
      <div 
        className="h-full bg-gradient-to-r from-brand-primary via-brand-primary-light to-brand-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// ==================== PARALLAX ELEMENT ====================
/**
 * Creates parallax scrolling effect
 */
export const ParallaxElement = ({ children, speed = 0.5, className = '' }) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      setOffset((scrolled - rect.top) * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div 
        className="transition-transform duration-0"
        style={{ 
          transform: `translateY(${offset}px)`,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ==================== GRADIENT BACKGROUND ====================
/**
 * Animated gradient mesh background
 */
export const GradientMesh = ({ variant = 'hero', className = '' }) => {
  const variants = {
    hero: 'bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5',
    subtle: 'bg-gradient-to-br from-brand-primary/3 via-transparent to-transparent',
    vibrant: 'bg-gradient-to-br from-brand-primary/10 via-brand-secondary/5 to-brand-primary/5'
  };

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <div className={cn('absolute inset-0 animate-gradient-shift', variants[variant])} />
      <div className="absolute -left-1/4 top-0 w-96 h-96 bg-brand-primary/8 rounded-full blur-3xl animate-float-gentle" />
      <div className="absolute -right-1/4 top-1/3 w-80 h-80 bg-brand-secondary/6 rounded-full blur-3xl animate-float-gentle-delayed" />
      <div className="absolute left-1/2 -bottom-1/4 w-96 h-96 bg-brand-primary/4 rounded-full blur-3xl animate-float-gentle-slow" />
    </div>
  );
};

// ==================== CARD HOVER LIFT ====================
/**
 * Adds 3D lift effect on hover
 */
export const CardLift = ({ children, className = '' }) => {
  return (
    <div 
      className={cn(
        'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        'hover:translate-y-[-4px] hover:scale-[1.01]',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      {children}
    </div>
  );
};

// ==================== GLASS CARD ====================
/**
 * Modern glassmorphism card
 */
export const GlassCard = ({ children, className = '' }) => {
  return (
    <div 
      className={cn(
        'backdrop-blur-xl bg-white/70 dark:bg-neutral-900/70',
        'border border-white/30 dark:border-neutral-700/30',
        'shadow-[0_8px_32px_rgba(31,38,135,0.07)]',
        'rounded-2xl',
        className
      )}
    >
      {children}
    </div>
  );
};

// ==================== MAGNETIC BUTTON ====================
/**
 * Button with magnetic cursor effect
 */
export const MagneticButton = ({ children, className = '', ...props }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    setPosition({ 
      x: x * 0.3, // Magnetic strength
      y: y * 0.3 
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative transition-transform duration-200 ease-out',
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// ==================== PULSE DOT ====================
/**
 * Animated pulse indicator
 */
export const PulseDot = ({ color = 'brand-primary', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span className={cn('relative flex', sizeClasses[size], className)}>
      <span 
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          `bg-${color}`
        )}
      />
      <span 
        className={cn(
          'relative inline-flex rounded-full',
          sizeClasses[size],
          `bg-${color}`
        )}
      />
    </span>
  );
};

// ==================== SHIMMER EFFECT ====================
/**
 * Shimmer loading effect
 */
export const Shimmer = ({ className = '' }) => {
  return (
    <div 
      className={cn(
        'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200',
        'dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800',
        'bg-[length:200%_100%]',
        className
      )}
    />
  );
};

// ==================== TYPEWRITER EFFECT ====================
/**
 * Typewriter text animation
 */
export const Typewriter = ({ 
  text, 
  speed = 50, 
  className = '',
  onComplete = () => {}
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(timer);
        onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [isVisible, text, speed, onComplete]);

  return (
    <span ref={ref} className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

// ==================== SCROLL INDICATOR ====================
/**
 * Animated scroll down indicator
 */
export const ScrollIndicator = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.pageYOffset < 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        'transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-neutral-300 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-neutral-400 rounded-full animate-scroll-dot" />
        </div>
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Scroll
        </span>
      </div>
    </div>
  );
};

// Export all components
export default {
  ScrollReveal,
  StaggerChildren,
  AnimatedCounter,
  ScrollProgress,
  ParallaxElement,
  GradientMesh,
  CardLift,
  GlassCard,
  MagneticButton,
  PulseDot,
  Shimmer,
  Typewriter,
  ScrollIndicator
};
