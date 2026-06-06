'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
// Supabase removed - using Better Auth + Server Actions
import { createBusiness, checkDomainAvailabilityAction, completeRegistrationSetupAction } from '@/lib/actions/basic/business';
import { seedBusinessProductsAction } from '@/lib/actions/standard/inventory/product';
import { domainKnowledge } from '@/lib/domainKnowledge';
import { PLAN_TIERS, PLAN_ORDER, resolvePlanTier } from '@/lib/config/plans';
import { suggestPlanTier } from '@/lib/config/domains';
import {
    getRegionalStandards,
    coerceRegistrationCountryValue,
    DEFAULT_REGISTRATION_COUNTRY_ISO,
    getRegistrationCountryOptions,
    getRegistrationCurrencyOptions,
    getPlanDisplayForRegion,
} from '@/lib/utils/regionalHelpers';
import { formatCurrency, isValidCurrency } from '@/lib/currency';
import { authClient } from '@/lib/auth-client';
import { useRegistrationPersistence, clearRegistrationData } from '@/lib/hooks/useRegistrationPersistence';
import { DataRecoveryDialog } from '@/components/registration/DataRecoveryDialog';
import { sendVerificationEmail, resendVerificationEmail, isEmailVerified } from '@/lib/actions/auth/verification';
import { toast } from 'react-hot-toast';
import {
    ChevronRight,
    ChevronLeft,
    Check,
    Store,
    Package,
    Layers,
    Rocket,
    CheckCircle2,
    ArrowRight,
    Factory,
    HeartPulse,
    Crown,
    Building2,
    BadgeCheck,
    Shield,
    Lock,
    Loader2,
    Cake,
    Palette,
    Book,
    ShoppingCart,
    Wheat,
    Sprout,
    Container,
    Stethoscope,
    Truck,
    Beef,
    Pizza,
    Dumbbell,
    Plane,
    Bed,
    PartyPopper,
    CarFront,
    GraduationCap,
    Clover,
    Wrench,
    Pill,
    Monitor,
    Zap,
    Gem,
    Home,
    Bird,
    Sun,
    Boxes,
    Snowflake,
    BookOpen,
    BicepsFlexed,
    BrickWall,
    Search,
    UtensilsCrossed,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Redundant import removed to fix build error <!-- id: 457 -->
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import * as LucideIcons from 'lucide-react';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { getPublicSupportEmail, getPublicStoreUrl } from '@/lib/marketing/site-url';
import { Textarea } from '@/components/ui/textarea';

const DOMAIN_CATEGORY_BLUEPRINTS = [
    {
        id: 'retail',
        name: 'Retail & Shops',
        icon: Store,
        domains: ['retail-shop', 'textile-wholesale', 'grocery', 'fmcg', 'ecommerce', 'garments', 'mobile', 'electronics-goods', 'boutique-fashion', 'leather-footwear', 'bookshop-stationery', 'supermarket']
    },
    {
        id: 'hospitality',
        name: 'POS & Hospitality',
        icon: UtensilsCrossed,
        domains: ['restaurant-cafe', 'bakery-confectionery', 'hotel-guesthouse']
    },
    {
        id: 'industrial',
        name: 'Manufacturing',
        icon: Factory,
        domains: ['chemical', 'paper-mill', 'paint', 'plastic-manufacturing', 'textile-mill', 'printing-packaging', 'furniture', 'ceramics-tiles', 'flour-mill', 'rice-mill', 'sugar-mill']
    },
    {
        id: 'services',
        name: 'Services',
        icon: HeartPulse,
        domains: ['travel', 'auto-workshop', 'diagnostic-lab', 'gym-fitness', 'event-management', 'rent-a-car', 'school-library', 'clinics-healthcare', 'logistics-transport', 'salon-spa', 'dental-clinic', 'veterinary-clinic']
    },
    {
        id: 'specialized',
        name: 'Specialized',
        icon: Crown,
        domains: ['auto-parts', 'pharmacy', 'computer-hardware', 'electrical', 'agriculture', 'gems-jewellery', 'real-estate', 'hardware-sanitary', 'poultry-farm', 'solar-energy', 'courier-logistics', 'wholesale-distribution', 'petrol-pump', 'cold-storage', 'book-publishing', 'steel-iron', 'construction-material', 'dairy-farm']
    }
];

const knownDomainSet = new Set(DOMAIN_CATEGORY_BLUEPRINTS.flatMap(group => group.domains));
const unassignedDomains = Object.keys(domainKnowledge).filter(domain => !knownDomainSet.has(domain));
const DOMAIN_CATEGORIES = DOMAIN_CATEGORY_BLUEPRINTS.map(group => {
    if (group.id !== 'specialized' || unassignedDomains.length === 0) return group;
    return {
        ...group,
        domains: [...group.domains, ...unassignedDomains].sort((a, b) => a.localeCompare(b))
    };
});

function recommendedPlanForDomain(domainKey) {
    return suggestPlanTier(domainKey, domainKnowledge[domainKey]);
}

/** Short bullets for plan comparison on step 3 (aligned with PLAN_TIERS keys). */
function planCardBullets(tier) {
    const cfg = PLAN_TIERS[tier];
    if (!cfg) return [];
    const users =
        cfg.limits?.max_users === -1 ? 'Unlimited users' : `Up to ${cfg.limits?.max_users} users`;
    const products =
        cfg.limits?.max_products === -1
            ? 'Unlimited products'
            : `Up to ${cfg.limits?.max_products} products`;
    return [users, products, cfg.tagline].filter(Boolean);
}

function buildRegistrationFormState(persisted) {
    const countryIso = coerceRegistrationCountryValue(persisted?.country) || DEFAULT_REGISTRATION_COUNTRY_ISO;
    const regional = getRegionalStandards(countryIso);
    const currency =
        typeof persisted?.currency === 'string' && isValidCurrency(persisted.currency)
            ? persisted.currency
            : regional.currency;
    return {
        businessName: persisted?.businessName || '',
        email: persisted?.email || '',
        password: persisted?.password || '',
        phone: persisted?.phone || '',
        country: countryIso,
        handle: persisted?.handle || '',
        category: persisted?.category || '',
        planTier: persisted?.planTier || 'free',
        logo: persisted?.logo || '',
        currency,
        ntn: persisted?.ntn || '',
        storeTagline: persisted?.storeTagline || '',
    };
}

export default function RegisterWizard() {
    const router = useRouter();
    const { user, session: authSession } = useAuth();
    const { updateBusiness } = useBusiness();
    const { language } = useLanguage();
    const t = translations[language];
    
    // Form persistence hook - auto-saves and recovers form data
    const {
        formData: persistedFormData,
        setFormData: setPersistedFormData,
        currentStep: persistedStep,
        setCurrentStep: setPersistedStep,
        showRecoveryDialog,
        acceptRecoveredData,
        rejectRecoveredData,
        clearSavedData,
        hasRecoveredData
    } = useRegistrationPersistence(1);

    const [step, setStep] = useState(persistedStep);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [handleStatus, setHandleStatus] = useState({ checking: false, available: true, error: '' });
    const [verificationState, setVerificationState] = useState('idle'); // idle, sending, sent, verified
    const [resendTimer, setResendTimer] = useState(0);
    const [newUser, setNewUser] = useState(null);
    
    // Form data with persistence
    const [formData, setFormData] = useState(() => buildRegistrationFormState(persistedFormData));

    const prevCountryRef = React.useRef(null);
    useEffect(() => {
        if (prevCountryRef.current === null) {
            prevCountryRef.current = formData.country;
            return;
        }
        if (prevCountryRef.current === formData.country) return;
        prevCountryRef.current = formData.country;
        const regional = getRegionalStandards(formData.country);
        setFormData((prev) => ({ ...prev, currency: regional.currency }));
    }, [formData.country]);

    const regionalForWizard = getRegionalStandards(formData.country);

    // Sync step with persistence
    useEffect(() => {
        setStep(persistedStep);
    }, [persistedStep]);

    // Update form data with persistence
    const updateFormData = (updates) => {
        const newData = { ...formData, ...updates };
        setFormData(newData);
        setPersistedFormData(updates);
    };

    // Resend timer countdown
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    // Check if email is verified when returning from verification page
    useEffect(() => {
        const checkVerification = async () => {
            if (newUser && step === 2) {
                const result = await isEmailVerified(newUser.id);
                if (result.success && result.isVerified) {
                    setVerificationState('verified');
                    toast.success('Email verified successfully!');
                }
            }
        };
        checkVerification();
    }, [newUser, step]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        setFormData((prev) => {
            let next = { ...prev };
            const domainParam = params.get('domain');
            if (domainParam && domainKnowledge[domainParam]) {
                const recommendedPlan = recommendedPlanForDomain(domainParam);
                next = {
                    ...next,
                    category: domainParam,
                    planTier:
                        PLAN_ORDER[next.planTier] >= PLAN_ORDER[recommendedPlan]
                            ? next.planTier
                            : recommendedPlan,
                };
            }
            const planParam = params.get('planTier') || params.get('plan');
            if (planParam) {
                const resolved = resolvePlanTier(planParam);
                if (PLAN_TIERS[resolved]) {
                    next = { ...next, planTier: resolved };
                }
            }
            return next;
        });
    }, []);

    // Slug generation helper
    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleBusinessNameChange = (name) => {
        updateFormData({
            businessName: name,
            handle: generateSlug(name)
        });
    };

    const nextStep = () => {
        const newStep = step + 1;
        setStep(newStep);
        setPersistedStep(newStep);
    };
    const prevStep = () => {
        const newStep = step - 1;
        setStep(newStep);
        setPersistedStep(newStep);
    };

    // Debounced domain availability check
    useEffect(() => {
        if (!formData.handle || formData.handle.length < 3) return;

        const timer = setTimeout(async () => {
            setHandleStatus(prev => ({ ...prev, checking: true, error: '' }));
            try {
                const res = await checkDomainAvailabilityAction(formData.handle);
                setHandleStatus({ checking: false, available: res.available, error: res.available ? '' : 'This handle is already taken' });
            } catch (err) {
                setHandleStatus({ checking: false, available: false, error: 'Failed to verify handle' });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.handle]);

    const handleDomainSelect = (categoryKey) => {
        const recommendedPlan = recommendedPlanForDomain(categoryKey);
        setFormData(prev => ({
            ...prev,
            category: categoryKey,
            planTier: PLAN_ORDER[prev.planTier] >= PLAN_ORDER[recommendedPlan] ? prev.planTier : recommendedPlan,
        }));
        nextStep();
    };

    // Reusable Domain Button Component for DRY code
    const DomainButton = ({ domainKey }) => {
        const knowledge = domainKnowledge[domainKey] || {};
        const IconComponent = LucideIcons[knowledge.icon] || Rocket;
        const domainName = translations[language]?.domains?.[domainKey] || domainKey.replace('-', ' ');

        return (
            <button
                onClick={() => handleDomainSelect(domainKey)}
                className="group flex flex-col items-start p-4 rounded-2xl border border-gray-100 hover:border-wine/30 hover:bg-wine/5 transition-all text-left relative overflow-hidden active:scale-[0.97] w-full"
            >
                <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-wine/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div className="p-2 bg-gray-50 rounded-xl mb-3 group-hover:bg-wine group-hover:text-white transition-colors relative z-10">
                    <IconComponent className="w-5 h-5" />
                </div>
                <span className={`font-black text-gray-900 mb-1 relative z-10 ${language === 'ur' ? 'font-urdu' : ''}`}>
                    {domainName}
                </span>
                <span className={`text-[10px] text-gray-500 font-bold uppercase tracking-tight relative z-10 ${language === 'ur' ? 'font-urdu' : ''}`}>
                    {language === 'en' ? 'Enable vertical' : 'اسے منتخب کریں'}
                </span>
            </button>
        );
    };

    const seedBusinessData = async (businessId, domainKey, country) => {
        try {
            console.log(`Starting seeding for business ${businessId} with domain ${domainKey} in ${country}`);

            const standards = getRegionalStandards(country);
            const regionalTaxRate = standards.defaultTaxRate;

            // 1. Get Domain Knowledge
            const knowledge = domainKnowledge[domainKey] || domainKnowledge['retail-shop'];

            if (!knowledge || !knowledge.setupTemplate || (!knowledge.setupTemplate.suggestedItems && !knowledge.setupTemplate.suggestedProducts)) {
                console.log("No seeding template found for this domain.");
                return;
            }

            const items = knowledge.setupTemplate.suggestedProducts || knowledge.setupTemplate.suggestedItems || [];

            // 2. Define Master Schema Known Columns (Explicit columns in DB)
            const KNOWN_COLUMNS = [
                'name', 'description', 'business_id', 'stock', 'price', 'cost_price',
                'tax_percent', 'sku', 'barcode', 'category', 'brand', 'unit',
                'min_stock_level', 'reorder_point', 'location', 'batch_number',
                'expiry_date', 'manufacturing_date', 'hsn_code', 'is_active', 'image_url'
            ];

            // 3. Construct Items with Intelligent Mapping
            const itemsToInsert = items.map(item => {
                const cleanItem = {
                    business_id: businessId,
                    name: item.name,
                    category: item.category,
                    unit: item.unit || 'pcs',
                    price: 0, // Default
                    stock: 0, // Default
                    tax_percent: regionalTaxRate || knowledge.defaultTax || 0,
                    is_active: true,
                    domain_data: {} // Initialize domain_data
                };

                // Iterate over all keys in the source item
                Object.keys(item).forEach(key => {
                    if (KNOWN_COLUMNS.includes(key)) {
                        // If it's a known column, override/set it at top level (if present in item)
                        cleanItem[key] = item[key];
                    } else {
                        // If it's NOT a known column (e.g., Color, Fabric, IMEI), move to domain_data
                        cleanItem.domain_data[key] = item[key];
                    }
                });

                return cleanItem;
            });

            console.log("Seeding items:", itemsToInsert);

            // Use server action for secure product seeding
            const seedResult = await seedBusinessProductsAction({
                businessId,
                items: itemsToInsert
            });

            if (!seedResult.success) {
                console.error("Seeding Error:", seedResult.error);
                toast.error("Dashboard created, but sample products failed to load.");
            } else {
                console.log("Seeding successful:", seedResult.message);
            }

        } catch (err) {
            console.error("Seeding Exception:", err);
        }
    };

    const handleFinish = async () => {
        // Validation: If user is logged in, only check businessName and domain. If not, check all.
        const isAuth = !!user;
        if (!formData.businessName || (!isAuth && (!formData.email || !formData.password)) || !formData.handle || !formData.category) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);
        try {
            let newUser = user;

            // 1. If NOT logged in, Create Account first
            if (!newUser) {
                const { data: authData, error: authError } = await authClient.signUp.email({
                    email: formData.email,
                    password: formData.password,
                    name: formData.businessName,
                    username: formData.handle,
                });

                if (authError) {
                    if (authError.status === 422 || authError.code === 'USER_ALREADY_EXISTS') {
                        toast.error("An account with this email already exists. Please login instead.");
                        setIsLoading(false);
                        return;
                    }
                    if (authError.code === 'INVALID_EMAIL') {
                        toast.error("Please provide a valid email address.");
                        setIsLoading(false);
                        return;
                    }
                    if (authError.code === 'PASSWORD_TOO_SHORT') {
                        toast.error("Password is too short. Please use at least 8 characters.");
                        setIsLoading(false);
                        return;
                    }
                    throw authError;
                }
                newUser = authData?.user;
                setNewUser(newUser);
            }

            if (newUser) {
                // Send verification email after account creation
                if (!user) {
                    setVerificationState('sending');
                    const emailResult = await sendVerificationEmail(
                        newUser.id,
                        newUser.email || formData.email,
                        formData.businessName
                    );
                    if (emailResult.success) {
                        setVerificationState('sent');
                        toast.success('Verification email sent! Please check your inbox.');
                    }
                }
                // 2. Create business via Server Action
                const bizResult = await createBusiness({
                    userId: newUser.id,
                    businessName: formData.businessName,
                    email: newUser.email || formData.email, // Use authenticated email
                    phone: formData.phone,
                    country: formData.country,
                    domain: formData.handle, // Use the unique handle as 'domain'
                    category: formData.category || 'retail-shop',
                    planTier: formData.planTier || 'free',
                    currency: formData.currency,
                    ntn: formData.ntn,
                    description: formData.storeTagline || null,
                });

                if (bizResult.success) {
                    toast.success('Registration successful! Welcome to Tenvo.');

                    // 3. Seed initial products using server action
                    await seedBusinessData(bizResult.businessId, formData.category, formData.country);

                    // 4. Mark setup as complete (ownership-only action; reliable right after signup)
                    try {
                        const setupRes = await completeRegistrationSetupAction(bizResult.businessId, {
                            settings: { setup_completed: true, setup_at: new Date().toISOString() },
                        });
                        if (!setupRes.success) {
                            console.error('Failed to mark setup complete:', setupRes.error);
                        }
                    } catch (updateErr) {
                        console.error('Failed to mark setup complete:', updateErr);
                    }

                    // Clear registration persistence data on success
                    clearRegistrationData();

                    const dashboardDomain = String(formData.handle || '').trim().toLowerCase();
                    router.push(`/business/${dashboardDomain}`);
                    router.refresh();
                } else {
                    console.error("Business provision failed:", bizResult.error);

                    if (bizResult.code === 'DATABASE_SCHEMA_OUT_OF_DATE') {
                        toast.error(
                            bizResult.error ||
                                'Database needs updating. Run: bunx prisma migrate deploy',
                            { duration: 12000 }
                        );
                    } else if (bizResult.error?.includes("Domain Handle") || bizResult.error?.includes("already taken")) {
                        toast.error(`The domain "${formData.handle}" is already in use. Please pick a unique handle.`, { duration: 6000 });
                    } else {
                        toast.error(bizResult.error || 'Identity created, but dashboard could not be provisioned.');
                    }
                }
            }
        } catch (error) {
            console.error('Registration Error:', error);
            const msg = error.message || "Registration failed. Please check your details.";
            if (msg.includes("Invalid URL")) {
                toast.error("System configuration error. Please contact support.");
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Data Recovery Dialog - shown if previous registration data exists */}
            <DataRecoveryDialog
                isOpen={showRecoveryDialog}
                onClose={() => {}}
                onAccept={acceptRecoveredData}
                onReject={rejectRecoveredData}
                savedAt={persistedFormData._savedAt ? new Date(persistedFormData._savedAt) : null}
                ageHours={persistedFormData._savedAt ? Math.floor((Date.now() - new Date(persistedFormData._savedAt).getTime()) / (1000 * 60 * 60)) : 0}
                step={persistedStep}
            />

            <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc_0%,#eef4ff_100%)] flex flex-col p-4 md:p-6 lg:p-8 relative overflow-hidden">
                {/* Background Decorative Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-wine/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-300/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-6xl w-full mx-auto relative z-10 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <TenvoTextLogo />
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Setup</p>
                            <p className="text-xs font-bold text-gray-900">ISO-grade encrypted workspace</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Support</span>
                            <span className="text-sm font-bold text-gray-900">+92 300 1234567</span>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/login')} className="rounded-xl border-gray-200 font-bold hover:bg-white hover:border-wine/30">
                            Log In
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
                    {/* Top Progress */}
                    <div className="flex items-center gap-4 mb-8 max-w-xs mx-auto md:mx-0">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`h-2.5 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-wine shadow-sm shadow-wine/20' : 'bg-gray-200'}`} />
                                {i < 3 && <div className="h-0.5 w-2 bg-gray-100" />}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">
                            {step === 1 ? "Business Identity" :
                                step === 2 ? "Market Vertical" :
                                    "Final Configuration"}
                        </h1>
                        <p className="text-gray-500 font-medium text-lg">
                            {step === 1 ? "Define your business identity, compliance region, and public store defaults." :
                                step === 2 ? "Tailor the ERP to your industry needs." :
                                    "Setting up your localized compliance rules."}
                        </p>
                    </div>

                    {/* Trust Badges Row */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-8">
                        {[
                            { icon: Shield, text: 'FBR Certified' },
                            { icon: BadgeCheck, text: 'PSEB Registered' },
                            { icon: Lock, text: '256-bit SSL' },
                            { icon: Users, text: '450+ Businesses' },
                        ].map((badge, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-sm">
                                <badge.icon className="w-4 h-4 text-wine" />
                                <span className="text-xs font-bold text-gray-700">{badge.text}</span>
                            </div>
                        ))}
                    </div>

                    <Card className="mt-8 border border-white/80 shadow-[0_30px_90px_-44px_rgba(15,23,42,0.36)] rounded-[32px] overflow-hidden bg-white/92 backdrop-blur-xl">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row">
                                {/* Form Section */}
                                <div className="flex-1 p-8 md:p-12">
                                    {step === 1 && (
                                        <div className="grid gap-6 animate-in slide-in-from-left-4 duration-500">
                                            {user ? (
                                                <div className="bg-wine/5 border border-wine/10 rounded-2xl p-6 text-center space-y-4">
                                                    <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm">
                                                        <Building2 className="w-8 h-8 text-wine" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-xl text-gray-900">Welcome back, {user.name || user.email?.split('@')[0]}!</h3>
                                                        <p className="text-gray-500 text-sm mt-1">You are logged in as <span className="font-bold text-gray-900">{user.email}</span></p>
                                                    </div>
                                                    <p className="text-sm font-medium text-wine bg-white/50 p-3 rounded-xl">
                                                        Let&apos;s set up a new business entity under your existing account.
                                                    </p>
                                                </div>
                                            ) : null}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Legal Business Name</Label>
                                                    <Input
                                                        placeholder="Nexus Trading Co."
                                                        value={formData.businessName}
                                                        onChange={e => handleBusinessNameChange(e.target.value)}
                                                        className="h-12 rounded-2xl border-gray-100 focus:ring-wine/20"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 flex justify-between items-center">
                                                        <span>Workspace URL Handle</span>
                                                        {formData.handle && (
                                                            <span className={cn(
                                                                "text-[10px] font-black",
                                                                handleStatus.checking ? "text-gray-400" : (handleStatus.available ? "text-emerald-500" : "text-rose-500")
                                                            )}>
                                                                {handleStatus.checking ? "Checking..." : (handleStatus.available ? "Available ✓" : "Already Taken ✗")}
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="nexus-trading"
                                                            value={formData.handle}
                                                            onChange={e => setFormData({ ...formData, handle: generateSlug(e.target.value) })}
                                                            className={cn(
                                                                "h-12 rounded-2xl border-gray-100 focus:ring-wine/20 pr-16 sm:pr-20",
                                                                !handleStatus.available && formData.handle && "border-rose-200 bg-rose-50/30"
                                                            )}
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 pointer-events-none">
                                                            /store
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 font-medium leading-snug">
                                                        Your public storefront:{' '}
                                                        <span className="font-mono text-wine/90 break-all">
                                                            {getPublicStoreUrl(formData.handle || 'your-handle')}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Business Region</Label>
                                                    <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-gray-100 max-h-[min(24rem,70vh)]">
                                                            {getRegistrationCountryOptions().map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {`${opt.label} — ${opt.detail}`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Business phone (optional)</Label>
                                                    <Input
                                                        type="tel"
                                                        placeholder={`${regionalForWizard.phoneCode} · local number`}
                                                        value={formData.phone}
                                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                        className="h-12 rounded-2xl border-gray-100 focus:ring-wine/20"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Operating currency</Label>
                                                    <Select
                                                        value={formData.currency}
                                                        onValueChange={(v) => setFormData({ ...formData, currency: v })}
                                                    >
                                                        <SelectTrigger className="h-12 rounded-2xl border-gray-100">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-gray-100 max-h-[min(24rem,70vh)]">
                                                            {getRegistrationCurrencyOptions(formData.country).map((row) => (
                                                                <SelectItem key={row.code} value={row.code}>
                                                                    {row.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[10px] text-gray-400 font-medium">Used for invoices, POS, and your public store prices.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                                                        {regionalForWizard.taxIdLabel} (optional)
                                                    </Label>
                                                    <Input
                                                        placeholder={`Registered ${regionalForWizard.taxIdLabel}`}
                                                        value={formData.ntn}
                                                        onChange={e => setFormData({ ...formData, ntn: e.target.value })}
                                                        className="h-12 rounded-2xl border-gray-100 focus:ring-wine/20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                                                    Public storefront tagline (optional)
                                                </Label>
                                                <Textarea
                                                    placeholder="Fresh groceries, same-day delivery in Karachi."
                                                    value={formData.storeTagline}
                                                    onChange={e => setFormData({ ...formData, storeTagline: e.target.value })}
                                                    maxLength={240}
                                                    rows={2}
                                                    className="rounded-2xl border-gray-100 focus:ring-wine/20 resize-none text-sm"
                                                />
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    Shown on your customer-facing store — you can refine this anytime in Store settings.
                                                </p>
                                            </div>

                                            {!user && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Administrator Email</Label>
                                                        <Input
                                                            type="email"
                                                            placeholder="owner@business.com"
                                                            value={formData.email}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                            className="h-12 rounded-2xl border-gray-100 focus:ring-wine/20"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Security Password</Label>
                                                        <Input
                                                            type="password"
                                                            placeholder="************"
                                                            value={formData.password}
                                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                            className="h-12 rounded-2xl border-gray-100 focus:ring-wine/20"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <Button
                                                className="w-full h-14 mt-4 text-lg font-black bg-wine hover:bg-wine/90 text-white rounded-2xl shadow-xl shadow-wine/20 transition-all active:scale-[0.98]"
                                                onClick={nextStep}
                                                disabled={!formData.businessName || !formData.handle || !handleStatus.available || handleStatus.checking || (!user && (!formData.email || !formData.password))}
                                            >
                                                Continue to Setup <ChevronRight className="ml-2 w-5 h-5" />
                                            </Button>

                                            {!user && (
                                                <div className="text-center mt-4">
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                        Already have an account? <span className="text-wine cursor-pointer hover:underline" onClick={() => router.push('/login')}>Log In here</span> to add a new business.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <Input
                                                    placeholder={language === 'en' ? "Search for your business type..." : "اپنی کاروباری قسم تلاش کریں..."}
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    className="h-14 pl-12 rounded-2xl border-gray-100 focus:ring-wine/20 bg-gray-50/50"
                                                />
                                            </div>
                                            {!searchTerm ? (
                                                <Tabs defaultValue="retail" className="w-full">
                                                    <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-8">
                                                        {DOMAIN_CATEGORIES.map(cat => (
                                                            <TabsTrigger
                                                                key={cat.id}
                                                                value={cat.id}
                                                                className="flex-1 min-w-[120px] rounded-xl h-11 border border-gray-100 data-[state=active]:bg-wine data-[state=active]:text-white data-[state=active]:border-wine transition-all font-bold text-xs"
                                                            >
                                                                <cat.icon className="w-4 h-4 mr-2" />
                                                                {cat.name}
                                                            </TabsTrigger>
                                                        ))}
                                                    </TabsList>

                                                    {DOMAIN_CATEGORIES.map(cat => (
                                                        <TabsContent key={cat.id} value={cat.id} className="mt-0">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {cat.domains.map(domain => (
                                                                    <DomainButton key={domain} domainKey={domain} />
                                                                ))}
                                                            </div>
                                                        </TabsContent>
                                                    ))}
                                                </Tabs>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-4">
                                                    {Object.keys(domainKnowledge)
                                                        .filter(domain => {
                                                            const nameEn = domain.replace('-', ' ').toLowerCase();
                                                            const nameUr = translations['ur']?.domains?.[domain]?.toLowerCase() || '';
                                                            return nameEn.includes(searchTerm.toLowerCase()) || nameUr.includes(searchTerm.toLowerCase());
                                                        })
                                                        .map(domain => (
                                                            <DomainButton key={domain} domainKey={domain} />
                                                        ))}
                                                </div>
                                            )}
                                            <Button variant="ghost" onClick={prevStep} className="font-bold text-gray-400 hover:text-wine uppercase tracking-widest text-[10px]">
                                                <ChevronLeft className="mr-2 w-4 h-4" /> Go Back
                                            </Button>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-500">
                                            <div className="bg-wine/5 border border-wine/10 rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
                                                <div className="w-20 h-20 bg-wine rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-wine/30 relative">
                                                    <div className="absolute inset-0 animate-ping bg-wine/20 rounded-[28px]" />
                                                    {LucideIcons[domainKnowledge[formData.category]?.icon] ?
                                                        React.createElement(LucideIcons[domainKnowledge[formData.category].icon], { className: "w-10 h-10 relative z-10" }) :
                                                        <Rocket className="w-10 h-10 relative z-10" />
                                                    }
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Enterprise Infrastructure Ready</h3>
                                                    <p className="text-gray-500 font-medium max-w-md">
                                                        We&apos;ve calibrated the dashboard for <span className="text-wine font-black uppercase tracking-tight">{translations[language]?.domains?.[formData.category] || formData.category?.replace('-', ' ')}</span>
                                                        {' '}with {regionalForWizard.taxLabel} expectations for {regionalForWizard.countryName} ({regionalForWizard.currency}). Adjust tax rates in settings as your adviser recommends.
                                                    </p>
                                                </div>

                                                {domainKnowledge[formData.category]?.setupTemplate?.categories?.length > 0 && (
                                                    <div className="w-full pt-4 border-t border-wine/10">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pre-built Industry Setup</p>
                                                        <div className="flex flex-wrap justify-center gap-2">
                                                            {domainKnowledge[formData.category].setupTemplate.categories.map(cat => (
                                                                <span key={cat} className="px-3 py-1 bg-white border border-wine/5 rounded-full text-[10px] font-bold text-wine shadow-sm">
                                                                    {cat}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Identity Confirmation</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100/50">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Company</span>
                                                        <span className="font-bold text-gray-900">{formData.businessName}</span>
                                                    </div>
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100/50">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Vertical</span>
                                                        <span className="font-bold text-wine capitalize">{formData.category.replace('-', ' ')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Subscription Plan</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {Object.entries(PLAN_TIERS).map(([tier, config]) => {
                                                        const isSelected = formData.planTier === tier;
                                                        const isRecommended = recommendedPlanForDomain(formData.category) === tier;
                                                        const { amount, currency, footnote } = getPlanDisplayForRegion(
                                                            config.price_pkr,
                                                            config.price_usd,
                                                            regionalForWizard
                                                        );
                                                        return (
                                                            <button
                                                                key={tier}
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, planTier: tier }))}
                                                                className={cn(
                                                                    'text-left rounded-2xl border p-4 transition-all',
                                                                    isSelected ? 'border-wine bg-wine/5 shadow-sm' : 'border-gray-200 bg-white hover:border-wine/30'
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-black text-gray-900 capitalize">{config.name}</span>
                                                                    {isRecommended && <span className="text-[10px] font-black uppercase text-emerald-600">Recommended</span>}
                                                                </div>
                                                                <p className="text-xs text-gray-500 font-medium">{config.tagline}</p>
                                                                <p className="text-xs font-black text-wine mt-2">
                                                                    {formatCurrency(amount, currency)} / mo
                                                                </p>
                                                                {footnote ? (
                                                                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{footnote}</p>
                                                                ) : null}
                                                                <ul className="mt-2 space-y-1">
                                                                    {planCardBullets(tier).map((item, idx) => (
                                                                        <li key={`${tier}-${idx}`} className="text-[11px] text-gray-600">• {item}</li>
                                                                    ))}
                                                                </ul>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <Button variant="outline" onClick={prevStep} className="flex-1 h-14 rounded-2xl font-bold border-gray-100">
                                                    Review Basic
                                                </Button>
                                                <Button onClick={handleFinish} disabled={isLoading} className="flex-[2] h-14 bg-wine hover:bg-wine/90 text-white font-black rounded-2xl shadow-xl shadow-wine/20 text-lg">
                                                    {isLoading ? (
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            <span>Launching...</span>
                                                        </div>
                                                    ) : "Generate Dashboard"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar Info */}
                                <div className="hidden lg:flex w-80 bg-[linear-gradient(180deg,rgba(248,251,255,0.95),rgba(238,244,255,0.82))] border-l border-slate-200 flex-col p-8 xl:p-10 justify-between">
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Deployment Assurance</h4>
                                        <div className="flex flex-col gap-2">
                                            <div className="p-3 bg-white w-fit rounded-xl shadow-sm border border-gray-100">
                                                <BadgeCheck className="w-5 h-5 text-wine" />
                                            </div>
                                            <h5 className="font-black text-gray-900 mt-1">Certified Platform</h5>
                                            <p className="text-xs text-gray-500 font-medium">FBR Tier-1 and SECP-ready architecture for consistent compliance workflows.</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="p-3 bg-white w-fit rounded-xl shadow-sm border border-gray-100">
                                                <Shield className="w-5 h-5 text-wine" />
                                            </div>
                                            <h5 className="font-black text-gray-900 mt-1">Zero-Trust Security</h5>
                                            <p className="text-xs text-gray-500 font-medium">Role-based isolation, encryption, and audit-safe records across modules.</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="p-3 bg-white w-fit rounded-xl shadow-sm border border-gray-100">
                                                <CheckCircle2 className="w-5 h-5 text-wine" />
                                            </div>
                                            <h5 className="font-black text-gray-900 mt-1">Fast Go-Live</h5>
                                            <p className="text-xs text-gray-500 font-medium">Complete setup in minutes with preconfigured chart, tax, and inventory defaults.</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white border border-gray-100 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Need onboarding help?</p>
                                        <p className="text-sm font-bold text-gray-900">{getPublicSupportEmail()}</p>
                                        <p className="text-xs text-gray-500 font-medium mt-1">Average response time under 15 minutes.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Credits */}
                <div className="mt-12 text-center text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] pb-8">
                    POWERED BY TENVO ENTERPRISE CLOUD
                </div>
            </div>
        </div>
        </>
    );
}
