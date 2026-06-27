'use client';

import { useState, useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { getDomainColors } from '@/lib/domainColors';
import toast from 'react-hot-toast';
import { loadBusinessSampleDataAction } from '@/lib/actions/basic/business';

/**
 * SetupWizard Component
 * Onboarding wizard to help users populate their inventory with domain-specific templates
 */
export function SetupWizard({ onComplete, category = 'retail-shop' }) {
    const { business, regionalStandards } = useBusiness();
    const colors = getDomainColors(category);
    const countryIso = regionalStandards?.countryCode || 'PK';
    const domainKnowledge = useMemo(
        () => getDomainKnowledge(category, { countryIso }),
        [category, countryIso]
    );

    const [step, setStep] = useState('welcome');
    const [loading, setLoading] = useState(false);

    const taxLabel = regionalStandards?.taxLabel || 'Tax';

    const setupTemplate = domainKnowledge?.setupTemplate || {};

    const handleSeed = async () => {
        setLoading(true);
        try {
            const result = await loadBusinessSampleDataAction({
                businessId: business?.id,
                domainKey: category,
                countryIso,
                replace: false,
            });

            if (result.success && !result.data?.skipped) {
                toast.success(result.data?.message || 'Sample workspace loaded, explore the hub, then remove sample data in Settings when ready.');
                setStep('finish');
            } else if (result.success && result.data?.skipped) {
                toast.success('Sample data is already loaded.');
                setStep('finish');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Seeding failed:', error);
            toast.error(error.message || 'Failed to load sample workspace');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        setStep('finish');
        onComplete?.();
    };

    if (step === 'welcome') {
        return (
            <Card className="max-w-2xl mx-auto border-none shadow-2xl bg-white/90 backdrop-blur-xl">
                <CardContent className="pt-12 pb-12 px-12 text-center space-y-6">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-inner"
                        style={{ backgroundColor: `${colors.primary}10`, color: colors.primary, boxShadow: `0 0 20px ${colors.primary}20` }}
                    >
                        <Sparkles className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
                        Welcome to {business?.business_name || business?.name || 'Your Business'}
                    </h2>
                    <p className="text-gray-500 text-lg max-w-md mx-auto">
                        Your <span className="font-bold" style={{ color: colors.primary }}>{category.replace(/-/g, ' ')}</span> workspace is ready for{' '}
                        <span className="font-bold">{regionalStandards?.countryName || countryIso}</span>, tax, intelligence, and category templates are configured.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mt-8">
                        <div className="p-4 rounded-xl border transition-all hover:shadow-md" style={{ backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}20` }}>
                            <CheckCircle2 className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
                            <h3 className="font-bold text-sm">Smart Config</h3>
                            <p className="text-xs text-gray-500">Fields tuned for {category.replace(/-/g, ' ')}</p>
                        </div>
                        <div className="p-4 rounded-xl border transition-all hover:shadow-md" style={{ backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}20` }}>
                            <CheckCircle2 className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
                            <h3 className="font-bold text-sm">Tax Compliance</h3>
                            <p className="text-xs text-gray-500">{taxLabel} defaults for {regionalStandards?.countryName || countryIso}</p>
                        </div>
                        <div className="p-4 rounded-xl border transition-all hover:shadow-md" style={{ backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}20` }}>
                            <CheckCircle2 className="w-5 h-5 mb-2" style={{ color: colors.primary }} />
                            <h3 className="font-bold text-sm">Optional sample data</h3>
                            <p className="text-xs text-gray-500">Load a full demo workspace to learn, then remove it in Settings</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <Button
                            onClick={() => setStep('seed')}
                            className="w-full h-12 text-lg font-bold text-white shadow-xl transition-all active:scale-95"
                            style={{ backgroundColor: colors.primary, boxShadow: `0 10px 20px -5px ${colors.primary}40` }}
                        >
                            Choose setup path <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Start empty, go to dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (step === 'seed') {
        return (
            <Card className="max-w-2xl mx-auto border-none shadow-2xl bg-white/90 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold">How would you like to start?</CardTitle>
                    <CardDescription>
                        Learn with a full sample workspace, or stay empty and add your own products, you can change this anytime in Settings → Tools.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-8">
                    <div className="p-5 rounded-2xl border-2 border-gray-100 bg-gray-50/80">
                        <h4 className="font-bold text-gray-900 mb-1">Load sample workspace (recommended for new users)</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Products with images, customers, warehouses, invoices, POS sales, payroll, and transfers, all tagged as sample data and removable in one click.
                        </p>
                        <Button
                            onClick={handleSeed}
                            disabled={loading}
                            className="text-white font-bold shadow-lg"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                            Load sample data
                        </Button>
                    </div>
                    <div className="p-5 rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-1">Start empty</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Keep category templates only and build your catalog from scratch.
                        </p>
                        <Button variant="outline" onClick={handleSkip}>
                            Continue without sample data
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto text-center border-none shadow-2xl bg-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="pt-12 pb-12 px-8 space-y-6">
                <div className={`w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6`}>
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Setup Complete!</h2>
                    <p className="text-gray-500 mt-2">
                        Your {category.replace(/-/g, ' ')} workspace is ready for action.
                    </p>
                </div>
                <Button
                    onClick={onComplete}
                    className="w-full h-12 text-lg font-bold bg-gray-900 text-white hover:bg-black"
                >
                    Go to Dashboard
                </Button>
            </CardContent>
        </Card>
    );
}
