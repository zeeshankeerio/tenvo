'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
// Supabase removed - using Better Auth + Server Actions
import { createBusiness, checkDomainAvailabilityAction, completeRegistrationSetupAction } from '@/lib/actions/basic/business';
import { domainKnowledge, getDomainKnowledge } from '@/lib/domainKnowledge';
import { getBrandPlaceholderExamples } from '@/lib/regionalMarket/index.js';
import { PLAN_TIERS, PLAN_ORDER, resolvePlanTier } from '@/lib/config/plans';
import { getDomainPackage } from '@/lib/config/domainPackages';
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
import Link from 'next/link';
import { AuthShell, AuthDivider, AuthFooterLink, AuthGoogleButton, authInputClass, authLabelClass } from '@/components/auth/AuthShell';
import { isEmailVerified } from '@/lib/actions/auth/verification';
import { getRegistrationEmailDeliveryAction } from '@/lib/actions/auth/registrationEmail';
import { mapEmailDeliveryError } from '@/lib/email/emailDeliveryConfig';
import { businessAPI } from '@/lib/api/business';
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

const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

const DOMAIN_CATEGORY_BLUEPRINTS = [
    {
        id: 'retail',
        name: 'Retail & Shops',
        icon: Store,
        domains: ['retail-shop', 'textile-wholesale', 'grocery', 'fmcg', 'ecommerce', 'garments', 'mobile', 'mobile-repairing', 'electronics-goods', 'boutique-fashion', 'leather-footwear', 'bookshop-stationery', 'supermarket', 'tyre-shop']
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
        domains: ['chemical', 'paper-mill', 'paint', 'plastic-manufacturing', 'textile-mill', 'printing-packaging', 'furniture', 'ceramics-tiles', 'flour-mill', 'rice-mill', 'sugar-mill', 'steel-industry', 'industrial-parts']
    },
    {
        id: 'services',
        name: 'Services',
        icon: HeartPulse,
        domains: ['travel', 'auto-workshop', 'diagnostic-lab', 'gym-fitness', 'event-management', 'rent-a-car', 'school-education', 'school-library', 'clinics-healthcare', 'logistics-transport', 'salon-spa', 'dental-clinic', 'veterinary-clinic']
    },
    {
        id: 'specialized',
        name: 'Specialized',
        icon: Crown,
        domains: ['auto-parts', 'auto-marketplace', 'vehicle-dealership', 'pharmacy', 'computer-hardware', 'electrical', 'agriculture', 'livestock-cattle', 'gems-jewellery', 'real-estate', 'hardware-sanitary', 'poultry-farm', 'solar-energy', 'courier-logistics', 'wholesale-distribution', 'petrol-pump', 'cold-storage', 'book-publishing', 'steel-iron', 'construction-material', 'dairy-farm']
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
        domainPackageKey: persisted?.domainPackageKey || '',
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
    const [verificationState, setVerificationState] = useState('idle'); // idle, sending, sent, verified (legacy link-based verify)
    const [resendTimer, setResendTimer] = useState(0);
    const [newUser, setNewUser] = useState(null);
    const [awaitingRegistrationOtp, setAwaitingRegistrationOtp] = useState(false);
    const [registrationOtp, setRegistrationOtp] = useState('');
    const [emailDeliveryHint, setEmailDeliveryHint] = useState(null);
    const [resumeChecked, setResumeChecked] = useState(false);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    
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
    const domainKnowledgeForWizard = formData.category
        ? getDomainKnowledge(formData.category, { countryIso: formData.country })
        : null;

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
            const packageParam = params.get('package');
            if (packageParam) {
                const pkg = getDomainPackage(packageParam);
                if (pkg) {
                    next = { ...next, domainPackageKey: packageParam };
                    if (!domainParam && pkg.defaultVertical && domainKnowledge[pkg.defaultVertical]) {
                        const recommendedPlan = recommendedPlanForDomain(pkg.defaultVertical);
                        next = {
                            ...next,
                            category: pkg.defaultVertical,
                            planTier:
                                PLAN_ORDER[next.planTier] >= PLAN_ORDER[pkg.recommendedPlanTier || recommendedPlan]
                                    ? next.planTier
                                    : pkg.recommendedPlanTier || recommendedPlan,
                        };
                    } else if (pkg.recommendedPlanTier && PLAN_TIERS[pkg.recommendedPlanTier]) {
                        next = {
                            ...next,
                            planTier:
                                PLAN_ORDER[next.planTier] >= PLAN_ORDER[pkg.recommendedPlanTier]
                                    ? next.planTier
                                    : pkg.recommendedPlanTier,
                        };
                    }
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

    const goToStep = (newStep) => {
        setStep(newStep);
        setPersistedStep(newStep);
        setPersistedFormData(formData);
    };

    const nextStep = () => goToStep(step + 1);
    const prevStep = () => goToStep(step - 1);

    const handleAcceptRecovery = () => {
        acceptRecoveredData();
        setFormData(buildRegistrationFormState(persistedFormData));
        if (persistedStep >= 1 && persistedStep <= 3) {
            setStep(persistedStep);
        }
    };

    // Debounced sync of wizard state to localStorage
    useEffect(() => {
        const timer = setTimeout(() => {
            setPersistedFormData(formData);
        }, 1500);
        return () => clearTimeout(timer);
    }, [formData, setPersistedFormData]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await getRegistrationEmailDeliveryAction();
            if (!cancelled && res?.success && res.hint) {
                setEmailDeliveryHint(res.hint);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Resume onboarding from URL params or returning verified users
    useEffect(() => {
        if (typeof window === 'undefined' || resumeChecked) return;

        const params = new URLSearchParams(window.location.search);
        const stepParam = params.get('step');
        const verifiedParam = params.get('verified') === 'true';

        if (stepParam === '2' || stepParam === '3') {
            const parsed = parseInt(stepParam, 10);
            if (parsed >= 1 && parsed <= 3) {
                setStep(parsed);
                setPersistedStep(parsed);
            }
        }

        if (verifiedParam) {
            setVerificationState('verified');
            toast.success('Email verified - finish your workspace setup.');
        }

        setResumeChecked(true);
    }, [resumeChecked, setPersistedStep]);

    useEffect(() => {
        if (!user?.id || resumeChecked === false) return;

        let cancelled = false;
        (async () => {
            if (user.email && !formData.email) {
                setFormData((prev) => ({ ...prev, email: user.email }));
            }

            const params = new URLSearchParams(window.location.search);
            const wantsStep3 = params.get('step') === '3' || params.get('verified') === 'true';

            try {
                const businesses = await businessAPI.getByUserId(user.id);
                if (cancelled || businesses?.length > 0) return;

                if (wantsStep3 && step < 3) {
                    setStep(3);
                    setPersistedStep(3);
                }

                const ev = await isEmailVerified(user.id);
                if (cancelled) return;
                if (ev.success && ev.isVerified) {
                    setVerificationState('verified');
                }
            } catch (e) {
                console.error('[register] resume check failed', e);
            }
        })();

        return () => { cancelled = true; };
    }, [user, resumeChecked, step, setPersistedStep, formData.email]);

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
        const domainName = translations[language]?.domains?.[domainKey] || domainKey.replace(/-/g, ' ');

        return (
            <button
                onClick={() => handleDomainSelect(domainKey)}
                className="group flex flex-col items-start rounded-xl border border-gray-100 p-2.5 text-left transition-all hover:border-wine/30 hover:bg-wine/5 active:scale-[0.98] w-full"
            >
                <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-wine/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div className="p-2 bg-gray-50 rounded-xl mb-3 group-hover:bg-wine group-hover:text-white transition-colors relative z-10">
                    <IconComponent className="w-5 h-5" />
                </div>
                <span className={`font-semibold text-gray-900 mb-1 relative z-10 ${language === 'ur' ? 'font-urdu' : ''}`}>
                    {domainName}
                </span>
                <span className={`text-[10px] text-gray-500 font-bold uppercase tracking-tight relative z-10 ${language === 'ur' ? 'font-urdu' : ''}`}>
                    {language === 'en' ? 'Enable vertical' : 'اسے منتخب کریں'}
                </span>
            </button>
        );
    };


    const completeProvisioning = async (newUser) => {
        const bizResult = await createBusiness({
            userId: newUser.id,
            businessName: formData.businessName,
            email: newUser.email || formData.email,
            phone: formData.phone,
            country: formData.country,
            domain: formData.handle,
            category: formData.category || 'retail-shop',
            planTier: formData.planTier || 'free',
            domainPackageKey: formData.domainPackageKey || undefined,
            currency: formData.currency,
            ntn: formData.ntn,
            description: formData.storeTagline || null,
        });

        if (!bizResult.success) {
            console.error('Business provision failed:', bizResult.error);
            if (bizResult.code === 'DATABASE_SCHEMA_OUT_OF_DATE') {
                toast.error(
                    bizResult.error || 'Database needs updating. Run: bunx prisma migrate deploy',
                    { duration: 12000 }
                );
            } else if (bizResult.error?.includes('Domain Handle') || bizResult.error?.includes('already taken')) {
                toast.error(`The domain "${formData.handle}" is already in use. Please pick a unique handle.`, { duration: 6000 });
            } else {
                toast.error(bizResult.error || 'Identity created, but dashboard could not be provisioned.');
            }
            return;
        }

        toast.success('Registration successful! Welcome to Tenvo.');

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

        clearRegistrationData();
        
        // Check if approval is required (Zoho/Busy-style workflow)
        if (bizResult.requiresApproval) {
            // Redirect to pending approval page
            const pendingPath = `/pending-approval`;
            if (typeof window !== 'undefined') {
                window.location.assign(pendingPath);
            } else {
                router.replace(pendingPath);
            }
            return;
        }
        
        // Platform owner or auto-approved - go directly to dashboard
        const dashboardDomain = String(formData.handle || '').trim().toLowerCase();
        const dashboardPath = `/business/${encodeURIComponent(dashboardDomain)}?tab=dashboard`;
        if (typeof window !== 'undefined') {
            window.location.assign(dashboardPath);
        } else {
            router.replace(dashboardPath);
        }
    };

    const handleResendRegistrationOtp = async () => {
        const emailNorm = formData.email.trim().toLowerCase();
        if (!emailNorm) return;
        if (resendTimer > 0) return;
        setResendTimer(60);
        const { error } = await authClient.emailOtp.sendVerificationOtp({
            email: emailNorm,
            type: 'email-verification',
        });
        if (error) {
            toast.error(mapEmailDeliveryError(error.message) || 'Could not resend code.');
            setResendTimer(0);
            return;
        }
        toast.success('A new code was sent to your email.');
    };

    const handleVerifyOtpAndProvision = async () => {
        const activeUser = user || newUser;
        if (!activeUser?.id) {
            toast.error('Session missing. Go back and try again.');
            return;
        }
        const emailNorm = (activeUser.email || formData.email).trim().toLowerCase();
        if (!registrationOtp.trim()) {
            toast.error('Enter the verification code from your email.');
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await authClient.emailOtp.verifyEmail({
                email: emailNorm,
                otp: registrationOtp.trim(),
            });
            if (error) {
                toast.error(error.message || 'Invalid or expired code.');
                setIsLoading(false);
                return;
            }
            setAwaitingRegistrationOtp(false);
            setRegistrationOtp('');
            setVerificationState('verified');
            await completeProvisioning(activeUser);
        } catch (e) {
            console.error(e);
            toast.error(e.message || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        const callbackURL =
            typeof window !== 'undefined' ? `${window.location.origin}/register?step=1` : '/register';
        setIsLoading(true);
        try {
            await authClient.signIn.social({
                provider: 'google',
                callbackURL,
            });
        } catch (e) {
            console.error(e);
            toast.error(e?.message || 'Google sign-in failed to start.');
            setIsLoading(false);
        }
    };

    const handleFinish = async () => {
        const sessionUser = user || newUser;
        const isAuth = !!sessionUser;
        if (awaitingRegistrationOtp) {
            toast.error('Enter the verification code sent to your email, then tap “Verify & launch”.');
            return;
        }
        if (!formData.businessName || (!isAuth && (!formData.email || !formData.password)) || !formData.handle || !formData.category) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsLoading(true);
        try {
            let activeUser = sessionUser;

            if (!activeUser) {
                const { data: authData, error: authError } = await authClient.signUp.email({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                    name: formData.businessName,
                    username: formData.handle,
                });

                if (authError) {
                    if (authError.status === 422 || authError.code === 'USER_ALREADY_EXISTS') {
                        toast.error('An account with this email already exists. Please login instead.');
                        setIsLoading(false);
                        return;
                    }
                    if (authError.code === 'INVALID_EMAIL') {
                        toast.error('Please provide a valid email address.');
                        setIsLoading(false);
                        return;
                    }
                    if (authError.code === 'PASSWORD_TOO_SHORT') {
                        toast.error('Password is too short. Please use at least 8 characters.');
                        setIsLoading(false);
                        return;
                    }
                    if (authError.code === 'INVALID_USERNAME') {
                        toast.error(
                            'Your store handle can only use letters, numbers, and hyphens (3 - 63 characters), and cannot be a reserved name. Adjust the handle field and try again.'
                        );
                        setIsLoading(false);
                        return;
                    }
                    throw authError;
                }
                activeUser = authData?.user;
                setNewUser(activeUser);

                const emailNorm = formData.email.trim().toLowerCase();
                const { error: otpErr } = await authClient.emailOtp.sendVerificationOtp({
                    email: emailNorm,
                    type: 'email-verification',
                });
                if (otpErr) {
                    toast.error(mapEmailDeliveryError(otpErr.message) || 'Account created, but we could not send a verification code. Contact support.');
                    setIsLoading(false);
                    return;
                }
                setAwaitingRegistrationOtp(true);
                setVerificationState('sent');
                setResendTimer(60);
                toast.success('Check your email for a 6-digit code to verify before we create your workspace.');
                setIsLoading(false);
                return;
            }

            if (activeUser) {
                const ev = await isEmailVerified(activeUser.id);
                const verified = Boolean(ev.success && ev.isVerified);
                if (!verified) {
                    const emailNorm = (activeUser.email || formData.email).trim().toLowerCase();
                    const { error: otpErr } = await authClient.emailOtp.sendVerificationOtp({
                        email: emailNorm,
                        type: 'email-verification',
                    });
                    if (otpErr) {
                        toast.error(mapEmailDeliveryError(otpErr.message) || 'Could not send verification code.');
                        setIsLoading(false);
                        return;
                    }
                    setAwaitingRegistrationOtp(true);
                    setVerificationState('sent');
                    setResendTimer(60);
                    toast.success('Check your email for a 6-digit code to verify before we create your workspace.');
                    setIsLoading(false);
                    return;
                }
                await completeProvisioning(activeUser);
            }
        } catch (error) {
            console.error('Registration Error:', error);
            const msg = error.message || 'Registration failed. Please check your details.';
            if (msg.includes('Invalid URL')) {
                toast.error('System configuration error. Please contact support.');
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stepMeta = {
        1: { title: 'Create your workspace', subtitle: 'Name your business, pick a region, and secure your account.' },
        2: { title: 'Choose your industry', subtitle: 'We apply the right tax, inventory, and report defaults for your vertical.' },
        3: { title: 'Review & launch', subtitle: 'Pick a plan, verify your email, and open your dashboard.' },
    };

    const stepIndicator = (
        <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                    <div
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                            step >= i ? 'bg-wine text-white shadow-sm shadow-wine/25' : 'bg-gray-200 text-gray-500'
                        )}
                    >
                        {i}
                    </div>
                    {i < 3 ? <div className={cn('h-px w-4', step > i ? 'bg-wine/40' : 'bg-gray-200')} /> : null}
                </div>
            ))}
        </div>
    );

    return (
        <>
            <DataRecoveryDialog
                isOpen={showRecoveryDialog}
                onClose={() => {}}
                onAccept={handleAcceptRecovery}
                onReject={rejectRecoveredData}
                savedAt={persistedFormData._savedAt ? new Date(persistedFormData._savedAt) : null}
                ageHours={persistedFormData._savedAt ? Math.floor((Date.now() - new Date(persistedFormData._savedAt).getTime()) / (1000 * 60 * 60)) : 0}
                step={persistedStep}
            />

            <AuthShell
                variant="register"
                title={stepMeta[step]?.title}
                subtitle={stepMeta[step]?.subtitle}
                maxWidthClass={step === 2 ? 'max-w-3xl' : step === 3 ? 'max-w-2xl' : 'max-w-xl'}
                stepIndicator={stepIndicator}
                headerRight={
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-gray-200 bg-white px-4 text-xs font-bold shadow-sm hover:bg-gray-50"
                        asChild
                    >
                        <Link href="/login">Log in</Link>
                    </Button>
                }
                footer={
                    step === 1 && !user ? (
                        <AuthFooterLink prompt="Already have an account?" href="/login" linkLabel="Sign in" />
                    ) : null
                }
            >
                                    {step === 1 && (
                                        <div className="grid gap-4 animate-in slide-in-from-left-4 duration-300">
                                            {user ? (
                                                <p className="rounded-xl border border-wine/15 bg-wine/5 px-3 py-2 text-xs font-medium text-gray-700">
                                                    Signed in as <strong>{user.email}</strong> - adding a new business.
                                                </p>
                                            ) : null}

                                            {!user && googleAuthEnabled ? (
                                                <>
                                                    <AuthGoogleButton disabled={isLoading} onClick={handleGoogleRegister}>
                                                        Continue with Google
                                                    </AuthGoogleButton>
                                                    <AuthDivider label="Or with email" />
                                                </>
                                            ) : null}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className={authLabelClass}>Legal business name</Label>
                                                    <Input
                                                        placeholder="Nexus Trading Co."
                                                        value={formData.businessName}
                                                        onChange={e => handleBusinessNameChange(e.target.value)}
                                                        className={authInputClass}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 flex justify-between items-center">
                                                        <span>Workspace URL Handle</span>
                                                        {formData.handle && (
                                                            <span className={cn(
                                                                "text-[10px] font-semibold",
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
                                                                "h-11 rounded-xl border-gray-200 focus:ring-wine/20 pr-16 sm:pr-20",
                                                                !handleStatus.available && formData.handle && "border-rose-200 bg-rose-50/30"
                                                            )}
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 pointer-events-none">
                                                            /store
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {getPublicStoreUrl(formData.handle || 'your-handle')}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Business Region</Label>
                                                    <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                                                        <SelectTrigger className={authInputClass}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-gray-100 max-h-[min(24rem,70vh)]">
                                                            {getRegistrationCountryOptions().map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {`${opt.label} - ${opt.detail}`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Currency</Label>
                                                    <Select
                                                        value={formData.currency}
                                                        onValueChange={(v) => setFormData({ ...formData, currency: v })}
                                                    >
                                                        <SelectTrigger className={authInputClass}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-gray-100 max-h-48">
                                                            {getRegistrationCurrencyOptions(formData.country).map((row) => (
                                                                <SelectItem key={row.code} value={row.code}>
                                                                    {row.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {!user ? (
                                                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Email</Label>
                                                            <Input
                                                                type="email"
                                                                placeholder="owner@business.com"
                                                                value={formData.email}
                                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                                className={authInputClass}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Password</Label>
                                                            <Input
                                                                type="password"
                                                                placeholder="Min. 8 characters"
                                                                value={formData.password}
                                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                                className={authInputClass}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setShowOptionalFields((v) => !v)}
                                                className="text-[10px] font-bold uppercase tracking-widest text-wine hover:underline"
                                            >
                                                {showOptionalFields ? 'Hide optional fields' : '+ Phone, tax ID, tagline (optional)'}
                                            </button>

                                            {showOptionalFields ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Phone</Label>
                                                        <Input
                                                            type="tel"
                                                            placeholder={`${regionalForWizard.phoneCode} number`}
                                                            value={formData.phone}
                                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                            className={cn(authInputClass, 'bg-white')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">{regionalForWizard.taxIdLabel}</Label>
                                                        <Input
                                                            placeholder={regionalForWizard.taxIdLabel}
                                                            value={formData.ntn}
                                                            onChange={e => setFormData({ ...formData, ntn: e.target.value })}
                                                            className={cn(authInputClass, 'bg-white')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Store tagline</Label>
                                                        <Input
                                                            placeholder="Short storefront headline"
                                                            value={formData.storeTagline}
                                                            onChange={e => setFormData({ ...formData, storeTagline: e.target.value })}
                                                            maxLength={240}
                                                            className={cn(authInputClass, 'bg-white')}
                                                        />
                                                    </div>
                                                </div>
                                            ) : null}

                                            <Button
                                                className="h-11 w-full rounded-xl bg-wine text-sm font-semibold text-white hover:bg-wine/90"
                                                onClick={nextStep}
                                                disabled={!formData.businessName || !formData.handle || !handleStatus.available || handleStatus.checking || (!user && (!formData.email || !formData.password))}
                                            >
                                                Continue <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-3 animate-in slide-in-from-left-4 duration-300">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                <Input
                                                    placeholder={language === 'en' ? 'Search business type…' : 'اپنی کاروباری قسم تلاش کریں…'}
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    className="h-11 pl-10 rounded-xl border-gray-200 bg-gray-50/50"
                                                />
                                            </div>
                                            {!searchTerm ? (
                                                <Tabs defaultValue="retail" className="w-full">
                                                    <TabsList className="mb-3 flex h-auto flex-wrap gap-1.5 bg-transparent p-0">
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
                                                            <div className="grid max-h-[min(42vh,280px)] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-3">
                                                                {cat.domains.map(domain => (
                                                                    <DomainButton key={domain} domainKey={domain} />
                                                                ))}
                                                            </div>
                                                        </TabsContent>
                                                    ))}
                                                </Tabs>
                                            ) : (
                                                <div className="grid max-h-[min(42vh,280px)] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-3">
                                                    {Object.keys(domainKnowledge)
                                                        .filter((domain) => {
                                                            const q = searchTerm.toLowerCase().trim();
                                                            if (!q) return true;
                                                            const slugSpaced = domain.replace(/-/g, ' ').toLowerCase();
                                                            const nameEn =
                                                                translations.en?.domains?.[domain]?.toLowerCase() || slugSpaced;
                                                            const nameUr = translations.ur?.domains?.[domain]?.toLowerCase() || '';
                                                            return (
                                                                domain.toLowerCase().includes(q) ||
                                                                slugSpaced.includes(q) ||
                                                                nameEn.includes(q) ||
                                                                nameUr.includes(q)
                                                            );
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
                                        <div className="space-y-4 animate-in zoom-in duration-300">
                                            <div className="rounded-xl border border-wine/15 bg-wine/5 px-4 py-3 text-sm text-gray-700">
                                                <span className="font-bold text-gray-900">{formData.businessName}</span>
                                                {' · '}
                                                <span className="capitalize text-wine">{formData.category.replace(/-/g, ' ')}</span>
                                                {' · '}
                                                {regionalForWizard.countryName} ({regionalForWizard.currency})
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Plan</p>
                                                <div className="grid grid-cols-2 gap-2">
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
                                                                    'rounded-xl border p-3 text-left transition-all',
                                                                    isSelected ? 'border-wine bg-wine/5' : 'border-gray-200 bg-white hover:border-wine/30'
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-semibold text-gray-900 capitalize">{config.name}</span>
                                                                    {isRecommended && <span className="text-[10px] font-semibold uppercase text-emerald-600">Recommended</span>}
                                                                </div>
                                                                <p className="text-xs text-gray-500 font-medium">{config.tagline}</p>
                                                                <p className="text-xs font-semibold text-wine mt-2">
                                                                    {formatCurrency(amount, currency)} / mo
                                                                </p>
                                                                {footnote ? (
                                                                    <p className="text-[10px] text-gray-400">{footnote}</p>
                                                                ) : null}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {awaitingRegistrationOtp ? (
                                                <div className="rounded-xl border border-wine/20 bg-wine/[0.06] p-4 space-y-3">
                                                    <p className="text-xs text-gray-600">
                                                        Code sent to{' '}
                                                        <strong>{(user?.email || newUser?.email || formData.email).trim().toLowerCase()}</strong>
                                                    </p>
                                                    {emailDeliveryHint ? (
                                                        <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">{emailDeliveryHint}</p>
                                                    ) : null}
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="registration-otp"
                                                            inputMode="numeric"
                                                            autoComplete="one-time-code"
                                                            maxLength={6}
                                                            placeholder="000000"
                                                            value={registrationOtp}
                                                            onChange={(e) => setRegistrationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                            className="h-11 flex-1 rounded-xl text-center font-mono text-lg tracking-widest"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="shrink-0 text-xs font-bold text-wine hover:underline disabled:opacity-45"
                                                            disabled={resendTimer > 0 || isLoading}
                                                            onClick={handleResendRegistrationOtp}
                                                        >
                                                            {resendTimer > 0 ? `${resendTimer}s` : 'Resend'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="flex gap-2 pt-1">
                                                <Button
                                                    variant="outline"
                                                    onClick={prevStep}
                                                    className="h-11 flex-1 rounded-xl font-bold"
                                                    disabled={awaitingRegistrationOtp}
                                                >
                                                    Back
                                                </Button>
                                                {awaitingRegistrationOtp ? (
                                                    <Button
                                                        type="button"
                                                        onClick={handleVerifyOtpAndProvision}
                                                        disabled={isLoading}
                                                        className="h-11 flex-[2] rounded-xl bg-wine text-sm font-semibold text-white hover:bg-wine/90"
                                                    >
                                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & launch'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={handleFinish}
                                                        disabled={isLoading}
                                                        className="h-11 flex-[2] rounded-xl bg-wine text-sm font-semibold text-white hover:bg-wine/90"
                                                    >
                                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Launch workspace'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
            </AuthShell>
        </>
    );
}
