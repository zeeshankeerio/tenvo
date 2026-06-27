'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  ChevronRight,
  Package,
  Calculator,
  ShoppingCart,
  Warehouse,
  Users,
  Heart,
  Brain,
  Shield,
  Code,
  CheckCircle2
} from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess';
import { getNextTier, getUpgradeBenefits, FEATURE_LABELS, PLAN_TIERS } from '@/lib/config/plans';
import { MODULE_PACKAGES } from '@/lib/config/plans';
import { cn } from '@/lib/utils';

const MODULE_ICONS = {
  essentials: Package,
  accounts: Calculator,
  pos: ShoppingCart,
  operations: Warehouse,
  hr: Users,
  crm: Heart,
  intelligence: Brain,
  governance: Shield,
  platform: Code,
};

/**
 * FeatureDiscoveryCard - Shows locked features with upgrade prompt
 * Use this in tabs where some features are gated
 */
export function FeatureDiscoveryCard({ 
  featureKey, 
  featureName, 
  description, 
  moduleKey,
  onUpgrade,
  className 
}) {
  const { planTier, business } = useBusiness();
  const businessSettings = business?.settings;
  const platformOverrides = business?.platformFeatureOverrides;
  const hasAccess = planHasFeatureWithPackaging(planTier, featureKey, businessSettings, platformOverrides);
  
  if (hasAccess) return null;
  
  const nextTier = getNextTier(planTier);
  const benefits = nextTier ? getUpgradeBenefits(planTier, nextTier) : [];
  const nextTierData = nextTier ? PLAN_TIERS[nextTier] : null;
  
  return (
    <Card className={cn("border-dashed border-2 bg-muted/30", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <Badge variant="secondary" className="text-xs">
            Upgrade to unlock
          </Badge>
        </div>
        <CardTitle className="text-lg mt-2">{featureName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {nextTierData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Available in {nextTierData.name}
              </span>
              <span className="font-bold text-primary">
                ₨{nextTierData.price_pkr.toLocaleString()}/mo
              </span>
            </div>
            
            {benefits.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  You&apos;ll also get:
                </p>
                <ul className="space-y-1">
                  {benefits.slice(0, 3).map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="line-clamp-1">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button 
              onClick={onUpgrade} 
              className="w-full"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to {nextTierData.name}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ModulePackageCard - Shows a module package with features and pricing
 * Use this in pricing page or upgrade flows
 */
export function ModulePackageCard({ 
  moduleKey, 
  isIncluded = false,
  onSelect,
  isSelected = false,
  showPrice = true 
}) {
  const module = MODULE_PACKAGES[moduleKey];
  const Icon = MODULE_ICONS[moduleKey] || Package;
  
  if (!module) return null;
  
  return (
    <Card 
      className={cn(
        "relative transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary",
        isIncluded && "bg-primary/5 border-primary"
      )}
      onClick={() => onSelect?.(moduleKey)}
    >
      {isIncluded && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Included
          </Badge>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {showPrice && !isIncluded && (
            <span className="font-bold text-primary">
              ₨{module.standalone_price_pkr.toLocaleString()}
            </span>
          )}
        </div>
        <CardTitle className="text-base">{module.name}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">
          {module.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-1">
          {module.features.slice(0, 4).map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span className="line-clamp-1">{FEATURE_LABELS[feature] || feature}</span>
            </div>
          ))}
          {module.features.length > 4 && (
            <p className="text-xs text-muted-foreground pl-5">
              +{module.features.length - 4} more features
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * UpgradePromptBanner - Inline banner for upgrade prompts
 * Shows when user hits limits or tries to access locked features
 */
export function UpgradePromptBanner({ 
  reason = 'feature', // 'feature' | 'limit' | 'usage'
  featureKey,
  limitName,
  currentUsage,
  limitValue,
  onUpgrade,
  className 
}) {
  const { planTier } = useBusiness();
  const nextTier = getNextTier(planTier);
  const nextTierData = nextTier ? PLAN_TIERS[nextTier] : null;
  
  if (!nextTierData) return null; // Already on highest tier
  
  const messages = {
    feature: `Upgrade to ${nextTierData.name} to unlock this feature`,
    limit: `You&apos;ve reached your ${limitName} limit (${currentUsage}/${limitValue})`,
    usage: `You&apos;re at ${Math.round((currentUsage / limitValue) * 100)}% of your ${limitName} limit`,
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20",
        className
      )}
    >
      <div className="p-2 rounded-full bg-primary/20">
        <TrendingUp className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {messages[reason]}
        </p>
        <p className="text-xs text-muted-foreground">
          {nextTierData.name}: ₨{nextTierData.price_pkr.toLocaleString()}/mo
        </p>
      </div>
      
      <Button 
        size="sm" 
        onClick={onUpgrade}
        className="shrink-0"
      >
        Upgrade
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

/**
 * ModulePicker - Allows users to build custom packages
 * For Growth+ tiers to pick additional modules
 */
export function ModulePicker({ 
  selectedModules = [], 
  includedModules = [],
  onChange,
  baseTier = 'growth' 
}) {
  const basePrice = PLAN_TIERS[baseTier]?.price_pkr || 2499;
  
  const availableModules = Object.keys(MODULE_PACKAGES).filter(
    key => !includedModules.includes(key)
  );
  
  const calculatePrice = () => {
    let moduleTotal = selectedModules.reduce((sum, key) => {
      const module = MODULE_PACKAGES[key];
      return sum + (module?.standalone_price_pkr || 0);
    }, 0);
    
    // Bundle discount
    let discount = 0;
    if (selectedModules.length >= 5) discount = 0.30;
    else if (selectedModules.length >= 3) discount = 0.10;
    
    return {
      total: basePrice + moduleTotal,
      discounted: Math.round((basePrice + moduleTotal) * (1 - discount)),
      discount: Math.round((basePrice + moduleTotal) * discount),
    };
  };
  
  const pricing = calculatePrice();
  
  const toggleModule = (key) => {
    const newSelection = selectedModules.includes(key)
      ? selectedModules.filter(k => k !== key)
      : [...selectedModules, key];
    onChange?.(newSelection);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Included modules */}
        {includedModules.map(key => (
          <ModulePackageCard
            key={key}
            moduleKey={key}
            isIncluded={true}
            showPrice={false}
          />
        ))}
        
        {/* Available modules */}
        {availableModules.map(key => (
          <ModulePackageCard
            key={key}
            moduleKey={key}
            isSelected={selectedModules.includes(key)}
            onSelect={toggleModule}
          />
        ))}
      </div>
      
      {selectedModules.length > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Package Total</p>
                {pricing.discount > 0 && (
                  <p className="text-sm text-green-600">
                    Bundle discount: -₨{pricing.discount.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                {pricing.discount > 0 && (
                  <p className="text-sm text-muted-foreground line-through">
                    ₨{pricing.total.toLocaleString()}
                  </p>
                )}
                <p className="text-2xl font-bold text-primary">
                  ₨{pricing.discounted.toLocaleString()}/mo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default {
  FeatureDiscoveryCard,
  ModulePackageCard,
  UpgradePromptBanner,
  ModulePicker,
};
