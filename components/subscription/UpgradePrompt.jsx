'use client';

import React from 'react';
import { Crown, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolvePlanTier, PLAN_TIERS, getNextTier } from '@/lib/config/plans';

const PLAN_COLORS = {
    free: 'from-gray-400 to-gray-500',
    starter: 'from-blue-500 to-blue-600',
    professional: 'from-violet-500 to-violet-600',
    business: 'from-amber-500 to-amber-600',
    enterprise: 'from-wine-500 to-wine-600',
    // Legacy aliases
    basic: 'from-gray-400 to-gray-500',
    standard: 'from-blue-500 to-blue-600',
    premium: 'from-amber-500 to-amber-600',
};

export function UpgradePrompt({ currentPlan = 'free', featureName = '', requiredPlan = 'starter', onUpgrade }) {
    const resolvedCurrent = resolvePlanTier(currentPlan);
    const resolvedRequired = resolvePlanTier(requiredPlan);
    const currentTier = PLAN_TIERS[resolvedCurrent] || PLAN_TIERS.free;
    const requiredTier = PLAN_TIERS[resolvedRequired] || PLAN_TIERS.starter;
    const requiredColor = PLAN_COLORS[resolvedRequired] || PLAN_COLORS.starter;
    const currentColor = PLAN_COLORS[resolvedCurrent] || PLAN_COLORS.free;

    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className={cn(
                'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-lg',
                requiredColor, 'shadow-gray-200'
            )}>
                <Lock className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {featureName || 'This feature'} requires the {requiredTier.name} plan
            </h3>

            <p className="text-sm text-gray-500 max-w-md mb-6">
                Upgrade to {requiredTier.name} to unlock {featureName || 'this feature'} and more powerful tools for your business.
            </p>

            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                    <Crown className="w-3.5 h-3.5" />
                    {currentTier.name}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-gradient-to-r',
                    requiredColor
                )}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {requiredTier.name}
                </div>
            </div>

            <Button
                onClick={onUpgrade}
                className={cn(
                    'px-6 py-3 rounded-xl font-bold shadow-lg bg-gradient-to-r',
                    requiredColor
                )}
            >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to {requiredTier.name}
            </Button>
        </div>
    );
}

