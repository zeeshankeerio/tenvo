'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  Sparkles, 
  Zap,
  Building2,
  Store,
  TrendingUp,
  Factory,
  Crown,
  Package,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  PLAN_TIERS, 
  MODULE_PACKAGES, 
  FEATURE_LABELS,
  getAllPlansOrdered,
  calculateCustomPackagePrice,
  TENVO_ADVANTAGES 
} from '@/lib/config/plans';
import { ModulePicker, ModulePackageCard } from './ModuleFeatureDiscovery';
import { cn } from '@/lib/utils';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';

const TIER_ICONS = {
  free: Package,
  starter: Store,
  growth: Building2,
  professional: TrendingUp,
  business: Factory,
  enterprise: Crown,
};

const TIER_COLORS = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  growth: 'bg-green-100 text-green-700',
  professional: 'bg-purple-100 text-purple-700',
  business: 'bg-orange-100 text-orange-700',
  enterprise: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700',
};

/**
 * PricingTierCard - Individual tier display
 */
function PricingTierCard({ tierKey, isPopular = false, onSelect, isAnnual = false }) {
  const tier = PLAN_TIERS[tierKey];
  const Icon = TIER_ICONS[tierKey] || Package;
  
  if (!tier) return null;
  
  const price = isAnnual ? Math.round(tier.price_pkr * 0.85) : tier.price_pkr;
  const usdPrice = isAnnual ? Math.round(tier.price_usd * 0.85) : tier.price_usd;
  
  return (
    <Card 
      className={cn(
        "relative flex flex-col transition-all hover:shadow-lg",
        isPopular && "ring-2 ring-primary shadow-lg scale-105"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-white px-3">
            <Sparkles className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {tier.badge && !isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-secondary text-secondary-foreground px-3">
            {tier.badge}
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className={cn("w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center", TIER_COLORS[tierKey])}>
          <Icon className="w-6 h-6" />
        </div>
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription className="text-sm">{tier.tagline}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              ₨{price.toLocaleString()}
            </span>
            <span className="text-muted-foreground">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ${usdPrice}/mo USD
          </p>
          {isAnnual && tier.price_pkr > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Save 15% with annual billing
            </p>
          )}
        </div>
        
        {/* Included Modules */}
        {tier.included_modules && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Included Modules
            </p>
            <div className="flex flex-wrap gap-1">
              {tier.included_modules.map(modKey => (
                <Badge key={modKey} variant="secondary" className="text-xs">
                  {MODULE_PACKAGES[modKey]?.name || modKey}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Key Limits */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Users</span>
            <span className="font-medium">
              {tier.limits.max_users === -1 ? 'Unlimited' : tier.limits.max_users}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Products</span>
            <span className="font-medium">
              {tier.limits.max_products === -1 ? 'Unlimited' : tier.limits.max_products.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Customers</span>
            <span className="font-medium">
              {tier.limits.max_customers === -1 ? 'Unlimited' : tier.limits.max_customers.toLocaleString()}
            </span>
          </div>
          {tier.limits.max_pos_terminals > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">POS Terminals</span>
              <span className="font-medium">{tier.limits.max_pos_terminals}</span>
            </div>
          )}
        </div>
        
        {/* Key Features */}
        <div className="space-y-2 mb-6 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Key Features
          </p>
          {Object.entries(tier.features)
            .filter(([, enabled]) => enabled)
            .slice(0, 6)
            .map(([key]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="line-clamp-1">{FEATURE_LABELS[key] || key}</span>
              </div>
            ))}
        </div>
        
        <Button 
          onClick={() => onSelect?.(tierKey)}
          className={cn(
            "w-full",
            isPopular ? "bg-primary" : "bg-secondary"
          )}
          size="lg"
        >
          {tierKey === 'free' ? 'Get Started Free' : `Choose ${tier.name}`}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * PricingComparisonTable - Detailed feature comparison
 */
function PricingComparisonTable() {
  const plans = getAllPlansOrdered();
  const keyFeatures = [
    'invoicing',
    'pos_terminal',
    'expense_tracking',
    'multi_warehouse',
    'manufacturing',
    'payroll_processing',
    'loyalty_programs',
    'ai_analytics',
    'approval_workflows',
    'api_access',
  ];
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4 font-medium">Feature</th>
            {plans.map(plan => (
              <th key={plan.key} className="text-center p-4 font-medium">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keyFeatures.map(feature => (
            <tr key={feature} className="border-b">
              <td className="p-4 text-sm">{FEATURE_LABELS[feature] || feature}</td>
              {plans.map(plan => (
                <td key={plan.key} className="text-center p-4">
                  {plan.features[feature] ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * TenvoAdvantages - Show competitive advantages
 */
function TenvoAdvantages() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(TENVO_ADVANTAGES).map(([key, section]) => (
        <Card key={key} className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {section.points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * PricingPage - Main pricing page component
 */
export function PricingPage({ onSelectTier, showComparison = true }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activeTab, setActiveTab] = useState('tiers');
  const [selectedModules, setSelectedModules] = useState([]);
  
  const plans = getAllPlansOrdered();
  
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose a bundled tier or build your own package. All plans include core business essentials.
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className={cn("text-sm", !isAnnual && "font-medium")}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              isAnnual ? "bg-primary" : "bg-gray-200"
            )}
          >
            <span className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
              isAnnual ? "left-7" : "left-1"
            )} />
          </button>
          <span className={cn("text-sm", isAnnual && "font-medium")}>
            Annual <span className="text-green-600 text-xs">(Save 15%)</span>
          </span>
        </div>
      </div>
      
      {/* Pricing Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="tiers">Bundle Tiers</TabsTrigger>
          <TabsTrigger value="modules">Build Your Own</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiers" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {plans.filter(p => p.key !== 'enterprise').map((tier, idx) => (
              <PricingTierCard
                key={tier.key}
                tierKey={tier.key}
                isPopular={tier.key === 'growth'}
                onSelect={onSelectTier}
                isAnnual={isAnnual}
              />
            ))}
          </div>
          
          {/* Enterprise CTA */}
          <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Need a Custom Enterprise Package?</h3>
                <p className="text-muted-foreground">
                  Unlimited users, custom features, SLA guarantee, and dedicated support
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  window.open(getBookMeetingHref(), '_blank', 'noopener,noreferrer');
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Book a meeting
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="modules" className="mt-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-muted-foreground mb-6">
              Start with a base tier and add only the modules you need. Bundle 3+ modules for 10% off, 5+ for 20% off.
            </p>
            
            <ModulePicker
              selectedModules={selectedModules}
              includedModules={['essentials']}
              onChange={setSelectedModules}
              baseTier="starter"
            />
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Feature Comparison */}
      {showComparison && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Feature Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <PricingComparisonTable />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Why Tenvo */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Why Businesses Choose Tenvo</h2>
        <TenvoAdvantages />
      </div>
    </div>
  );
}

export default PricingPage;
