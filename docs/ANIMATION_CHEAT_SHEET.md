# 🚀 Animation Cheat Sheet - Quick Reference

Copy-paste ready code snippets for common animation patterns.

---

## 📦 Import Statement

```jsx
import {
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
} from '@/components/marketing/effects/ModernEffects';
```

---

## 🎯 Common Patterns

### 1. Fade In Section on Scroll
```jsx
<ScrollReveal direction="up" threshold={0.2}>
  <section>Your content</section>
</ScrollReveal>
```

### 2. Animated Stats
```jsx
<AnimatedCounter 
  value={1250} 
  suffix="+" 
  prefix="$"
  duration={2000}
  className="text-4xl font-bold text-brand-primary"
/>
```

### 3. Card Grid with Hover Effect
```jsx
<div className="grid md:grid-cols-3 gap-6">
  {items.map((item, i) => (
    <ScrollReveal key={item.id} delay={i * 100}>
      <CardLift>
        <div className="p-6 rounded-2xl bg-white border">
          {item.content}
        </div>
      </CardLift>
    </ScrollReveal>
  ))}
</div>
```

### 4. Hero with Background Effect
```jsx
<section className="relative min-h-screen overflow-hidden">
  <GradientMesh variant="hero" />
  <ScrollProgress />
  
  <div className="relative z-10 container mx-auto">
    <ScrollReveal direction="up">
      <h1>Your Headline</h1>
      <p>Your description</p>
    </ScrollReveal>
  </div>
  
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
    <ScrollIndicator />
  </div>
</section>
```

### 5. Staggered List
```jsx
<StaggerChildren staggerDelay={100}>
  {features.map(feature => (
    <div key={feature.id} className="p-4">
      {feature.name}
    </div>
  ))}
</StaggerChildren>
```

### 6. Glass Card
```jsx
<GlassCard className="p-8">
  <h3>Glassmorphism Card</h3>
  <p>Modern Apple-style design</p>
</GlassCard>
```

### 7. Magnetic CTA Button
```jsx
<MagneticButton className="px-8 py-4 bg-brand-primary text-white rounded-xl font-semibold">
  Get Started
</MagneticButton>
```

### 8. Loading State
```jsx
<div className="space-y-3">
  <Shimmer className="h-12 rounded-lg" />
  <Shimmer className="h-8 rounded-lg w-3/4" />
  <Shimmer className="h-8 rounded-lg w-1/2" />
</div>
```

### 9. Status Indicator
```jsx
<div className="flex items-center gap-2">
  <PulseDot color="emerald-500" size="md" />
  <span>System Online</span>
</div>
```

### 10. Parallax Background
```jsx
<ParallaxElement speed={0.3}>
  <div className="absolute inset-0">
    <img src="/bg.jpg" alt="" className="object-cover" />
  </div>
</ParallaxElement>
```

---

## 🎨 Tailwind Utility Classes

### Fade Animations
```jsx
className="animate-fade-in"
className="animate-fade-in-up"
className="animate-fade-in-down"
className="animate-fade-in-left"
className="animate-fade-in-right"
```

### Floating
```jsx
className="animate-float-gentle"
className="animate-float-gentle-delayed"
className="animate-float-slow"
```

### Shimmer Loading
```jsx
className="animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]"
```

### Pulse Variants
```jsx
className="animate-pulse"
className="animate-pulse-slow"
className="animate-pulse-fast"
```

### Gradient Animation
```jsx
className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-[length:200%_auto] animate-gradient-x"
```

---

## 🎯 Hover Effects

### Button Hover
```jsx
className="
  transition-all duration-300 ease-smooth
  hover:scale-105 hover:shadow-brand-lg
  active:scale-100
"
```

### Card Hover
```jsx
className="
  transition-all duration-300 ease-smooth
  hover:translate-y-[-4px] hover:shadow-strong
"
```

### Image Zoom
```jsx
<div className="overflow-hidden rounded-lg">
  <img 
    src="/image.jpg"
    className="transition-transform duration-500 hover:scale-110"
  />
</div>
```

### Border Glow
```jsx
className="
  border border-neutral-200
  transition-all duration-300
  hover:border-brand-primary hover:shadow-brand
"
```

---

## 🏗️ Layout Patterns

### Full-Page Section with Reveal
```jsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  <GradientMesh variant="subtle" />
  
  <div className="relative z-10 container mx-auto px-4">
    <ScrollReveal direction="up" threshold={0.3}>
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h2 className="text-5xl font-bold">Section Title</h2>
        <p className="text-xl text-neutral-600">Description</p>
      </div>
    </ScrollReveal>
  </div>
</section>
```

### Feature Grid
```jsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map((feature, index) => (
    <ScrollReveal 
      key={feature.id} 
      direction="up" 
      delay={index * 100}
    >
      <CardLift>
        <GlassCard className="p-6 h-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-lg">{feature.title}</h3>
          </div>
          <p className="text-neutral-600">{feature.description}</p>
        </GlassCard>
      </CardLift>
    </ScrollReveal>
  ))}
</div>
```

### Stats Row
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
  {stats.map((stat, i) => (
    <ScrollReveal key={i} direction="up" delay={i * 100}>
      <div className="text-center">
        <AnimatedCounter 
          value={stat.value} 
          suffix={stat.suffix}
          className="text-4xl font-bold text-brand-primary block mb-2"
        />
        <p className="text-sm text-neutral-500 font-semibold">
          {stat.label}
        </p>
      </div>
    </ScrollReveal>
  ))}
</div>
```

---

## 🔧 Custom Timing Functions

```jsx
// Smooth (Apple-style)
className="ease-[cubic-bezier(0.16,1,0.3,1)]"

// Bounce (Playful)
className="ease-[cubic-bezier(0.34,1.56,0.64,1)]"

// Expo Out (Fast start, slow end)
className="ease-[cubic-bezier(0.16,1,0.3,1)]"

// Expo In (Slow start, fast end)
className="ease-[cubic-bezier(0.7,0,0.84,0)]"
```

---

## ⚡ Performance Utilities

```jsx
// Hardware acceleration
className="gpu"

// Will-change optimization
className="will-change-transform"
className="will-change-opacity"

// Remove will-change after animation
<div 
  className={isAnimating ? 'will-change-transform' : ''}
  onAnimationEnd={() => setIsAnimating(false)}
/>
```

---

## ♿ Accessibility

### Respect Reduced Motion
```jsx
className="motion-safe:animate-fade-in motion-reduce:opacity-100"
```

### Focus Styles
```jsx
className="
  focus-visible:outline-none 
  focus-visible:ring-2 
  focus-visible:ring-brand-primary 
  focus-visible:ring-offset-2
"
```

---

## 🎬 Animation Sequences

### Staggered Fade-In
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

### Cascade Effect
```jsx
<div className="space-y-4">
  <h2 className="animate-fade-in-up animation-delay-0">Title</h2>
  <p className="animate-fade-in-up animation-delay-100">Subtitle</p>
  <button className="animate-fade-in-up animation-delay-200">CTA</button>
</div>
```

---

## 🎨 Background Effects

### Mesh Gradient
```jsx
<div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute -left-1/4 top-0 w-96 h-96 bg-brand-primary/8 rounded-full blur-3xl animate-float-gentle" />
  <div className="absolute -right-1/4 top-1/3 w-80 h-80 bg-brand-secondary/6 rounded-full blur-3xl animate-float-gentle-delayed" />
  <div className="absolute left-1/2 -bottom-1/4 w-96 h-96 bg-brand-primary/4 rounded-full blur-3xl animate-float-slow" />
</div>
```

### Animated Grid Pattern
```jsx
<div className="absolute inset-0 opacity-[0.02]">
  <div 
    className="h-full w-full"
    style={{
      backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 1px, transparent 1px)',
      backgroundSize: '48px 48px'
    }}
  />
</div>
```

---

## 🎯 Interactive Elements

### Accordion Item
```jsx
<div className="border-b">
  <button 
    onClick={toggle}
    className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
  >
    <span className="font-semibold">Question</span>
    <ChevronDown 
      className={`transition-transform duration-300 ${
        isOpen ? 'rotate-180' : ''
      }`}
    />
  </button>
  {isOpen && (
    <div className="p-4 animate-fade-in-up">
      Answer content
    </div>
  )}
</div>
```

### Toggle Switch
```jsx
<button
  onClick={toggle}
  className={`
    relative w-12 h-6 rounded-full transition-colors duration-300
    ${isOn ? 'bg-brand-primary' : 'bg-neutral-300'}
  `}
>
  <span 
    className={`
      absolute top-1 left-1 w-4 h-4 bg-white rounded-full
      transition-transform duration-300 ease-smooth
      ${isOn ? 'translate-x-6' : 'translate-x-0'}
    `}
  />
</button>
```

---

## 📱 Mobile-Specific

### Touch-Friendly Tap Effect
```jsx
className="
  active:scale-95 
  transition-transform duration-150
  touch-manipulation
"
```

### Safe Area Insets
```jsx
className="pb-[env(safe-area-inset-bottom)]"
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

---

## 🎓 Pro Tips

### 1. Layer Your Effects
```jsx
<section className="relative">
  {/* Background layer */}
  <GradientMesh variant="subtle" />
  
  {/* Content layer */}
  <div className="relative z-10">
    <ScrollReveal>
      <CardLift>
        {/* Interactive layer */}
        <MagneticButton>Click</MagneticButton>
      </CardLift>
    </ScrollReveal>
  </div>
</section>
```

### 2. Combine Effects
```jsx
<ScrollReveal direction="up">
  <CardLift>
    <GlassCard className="group">
      <div className="transition-transform group-hover:scale-105">
        Content
      </div>
    </GlassCard>
  </CardLift>
</ScrollReveal>
```

### 3. Use CSS Variables for Dynamic Values
```jsx
<div 
  className="transition-all duration-300"
  style={{
    '--rotation': `${rotation}deg`,
    transform: 'rotate(var(--rotation))'
  }}
/>
```

---

## 🎉 Complete Example: Modern Hero Section

```jsx
import {
  ScrollReveal,
  AnimatedCounter,
  GradientMesh,
  ScrollProgress,
  ScrollIndicator,
  MagneticButton
} from '@/components/marketing/effects/ModernEffects';

export default function ModernHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <GradientMesh variant="hero" />
      
      {/* Scroll progress */}
      <ScrollProgress />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <ScrollReveal direction="up" threshold={0.3}>
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Build Better, Ship Faster
            </h1>
            
            {/* Description */}
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              The modern platform for ambitious teams
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton className="px-8 py-4 bg-brand-primary text-white rounded-xl font-semibold">
                Get Started Free
              </MagneticButton>
              <button className="px-8 py-4 border-2 border-neutral-200 rounded-xl font-semibold hover:border-brand-primary transition-colors">
                Watch Demo
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12">
              <div>
                <AnimatedCounter 
                  value={10000} 
                  suffix="+" 
                  className="text-3xl font-bold text-brand-primary block mb-1"
                />
                <p className="text-sm text-neutral-500">Active Users</p>
              </div>
              <div>
                <AnimatedCounter 
                  value={99.9} 
                  suffix="%" 
                  className="text-3xl font-bold text-brand-primary block mb-1"
                />
                <p className="text-sm text-neutral-500">Uptime</p>
              </div>
              <div>
                <AnimatedCounter 
                  value={24} 
                  suffix="/7" 
                  className="text-3xl font-bold text-brand-primary block mb-1"
                />
                <p className="text-sm text-neutral-500">Support</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <ScrollIndicator />
      </div>
    </section>
  );
}
```

---

## 🔗 Quick Links

- **Full Documentation**: `HOMEPAGE_MODERNIZATION_PLAN.md`
- **Implementation Examples**: `HOMEPAGE_IMPLEMENTATION_EXAMPLE.md`
- **Tailwind Config**: `TAILWIND_ANIMATION_CONFIG.md`
- **Component Library**: `components/marketing/effects/ModernEffects.jsx`

---

**Happy animating! 🎨✨**
