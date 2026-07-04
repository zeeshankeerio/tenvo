'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authClient, useSession } from '@/lib/auth-client';
import { productAPI, businessAPI } from '@/lib/api';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import {
  loadBusinessSampleDataAction,
  removeBusinessSampleDataAction,
  getBusinessSampleDataStateAction,
} from '@/lib/actions/basic/business';
import { useBusiness } from '@/lib/context/BusinessContext';
import { PLAN_TIERS, PLAN_FEATURE_TOGGLE_KEYS, resolvePlanTier, FEATURE_LABELS, PLAN_ORDER, FEATURE_MIN_PLAN } from '@/lib/config/plans';
import { getPackagingFromSettings } from '@/lib/subscription/effectivePlanAccess';
import {
  PLAN_LIMIT_OVERRIDE_KEYS,
  LIMIT_OVERRIDE_LABELS,
  formatPlanLimitValue,
  resolveEffectiveBusinessLimits,
} from '@/lib/utils/businessLimitOverrides';
import { updateOwnerBusinessPackagingAction } from '@/lib/actions/basic/business';
import { resetTeamMemberPassword, createTeamMemberWithPassword } from '@/lib/actions/admin/teamManagement';
import useSubscription from '@/lib/hooks/useSubscription';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CityAutocomplete } from './CityAutocomplete';
import {
  Database, PlusCircle, LayoutGrid, ArrowLeftRight, Loader2, Sparkles, Trash2,
  HardDriveDownload, Save, Building2, Shield, Globe, Zap, CreditCard, Users, UserCog,
  KeyRound, UserPlus, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import ManualPaymentRequestPanel from '@/components/billing/ManualPaymentRequestPanel';
import DomainPackageBillingCards from '@/components/billing/DomainPackageBillingCards';
import { PosSettingsPanel } from '@/components/pos/PosSettingsPanel';
import { isPosRelevant } from '@/lib/config/domains';

function buildProfileFormData(b) {
  if (!b?.id) {
    return {
      businessName: '',
      ntn: '',
      srn: '',
      phone: '',
      email: '',
      address: '',
      city: 'Karachi',
    };
  }
  return {
    businessName: b.business_name || '',
    ntn: b.ntn || '',
    srn: b.srn || '',
    phone: b.phone || '',
    email: b.email || '',
    address: b.address || '',
    city: b.city || 'Karachi',
  };
}

/**
 * Settings Manager (Localized for Pakistan)
 * Manages Business Profile, Compliance, and System Preferences
 */
export function SettingsManager({ category }) {
  const { business, updateBusiness, role, isPlatformOwner, planTier, regionalStandards } = useBusiness();
  const { initiateCheckout, isRedirecting, stripeCheckoutAvailable, devInstantBilling, fetchSubscription } = useSubscription();

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(() => buildProfileFormData(business));
  const [formSyncedBusinessId, setFormSyncedBusinessId] = useState(() => business?.id ?? null);

  const [team, setTeam] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('salesperson');
  const [teamBusy, setTeamBusy] = useState(false);
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('salesperson');
  const [createBusy, setCreateBusy] = useState(false);
  const [pwdMember, setPwdMember] = useState(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdSetBusy, setPwdSetBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [packageBusy, setPackageBusy] = useState(false);
  const [offlinePackageKey, setOfflinePackageKey] = useState(null);
  const manualPaymentRef = useRef(null);
  const [packagingBusy, setPackagingBusy] = useState(false);
  const [localPackagingMode, setLocalPackagingMode] = useState('tier');
  const [localFeatureOverrides, setLocalFeatureOverrides] = useState(() => ({}));
  const { data: sessionData, refetch: refetchSession } = useSession();
  const twoFactorEnabled = !!sessionData?.user?.twoFactorEnabled;

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const [settingsPrefBusy, setSettingsPrefBusy] = useState(false);
  const [tfDialogOpen, setTfDialogOpen] = useState(false);
  const [tfStep, setTfStep] = useState('password');
  const [tfPassword, setTfPassword] = useState('');
  const [tfTotpUri, setTfTotpUri] = useState('');
  const [tfBackupCodes, setTfBackupCodes] = useState([]);
  const [tfVerifyCode, setTfVerifyCode] = useState('');
  const [tfBusy, setTfBusy] = useState(false);
  const [tfDisableOpen, setTfDisableOpen] = useState(false);
  const [tfDisablePassword, setTfDisablePassword] = useState('');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingTools, setLoadingTools] = useState(false);
  const [sampleDataState, setSampleDataState] = useState(null);
  const [loadSampleOpen, setLoadSampleOpen] = useState(false);
  const [removeSampleOpen, setRemoveSampleOpen] = useState(false);
  const normalizedRole = role || 'viewer';
  const canManageUsers = isPlatformOwner || ['owner', 'admin'].includes(normalizedRole);
  const canManageBilling = isPlatformOwner || normalizedRole === 'owner';
  const canOwnerPackaging = isPlatformOwner || normalizedRole === 'owner';
  const canManageAdvancedTools = canManageUsers;
  const roleLabel = normalizedRole.replace(/_/g, ' ');
  const activeTeamCount = team.filter(member => member.status === 'active').length;

  const billingLimitSnapshot = useMemo(
    () => resolveEffectiveBusinessLimits(business || {}),
    [business]
  );

  const enterpriseOnlyFeatureKeys = useMemo(() => {
    const freeKeys = new Set(Object.keys(PLAN_TIERS.free.features));
    return new Set(
      Object.keys(PLAN_TIERS.enterprise.features).filter((k) => !freeKeys.has(k))
    );
  }, []);

  const visibleSections = useMemo(() => {
    return [
      { value: 'profile', label: 'Business Profile', visible: true },
      { value: 'compliance', label: 'Compliance', visible: true },
      { value: 'financials', label: 'Financials', visible: true },
      { value: 'billing', label: 'Billing', visible: canManageBilling },
      { value: 'team', label: 'Team', visible: canManageUsers },
      { value: 'notifications', label: 'Automation', visible: true },
      { value: 'security', label: 'Security', visible: true },
      { value: 'tools', label: 'Tools', visible: canManageAdvancedTools },
    ].filter(section => section.visible);
  }, [canManageBilling, canManageUsers, canManageAdvancedTools]);

  const automationPrefs = useMemo(() => {
    const raw = business?.settings?.automation;
    const obj = raw && typeof raw === 'object' ? raw : {};
    return {
      lowStockAlerts: obj.lowStockAlerts !== false,
      invoiceSms: obj.invoiceSms === true,
    };
  }, [business?.settings?.automation]);

  const multiCurrencyEnabled = useMemo(() => {
    const d = business?.settings?.domain_defaults;
    return !!(d && typeof d === 'object' && d.multiCurrency);
  }, [business?.settings?.domain_defaults]);

  const availableSectionValues = useMemo(() => visibleSections.map(s => s.value), [visibleSections]);

  const sectionFromUrl = searchParams.get('section');
  const urlDrivenTab = useMemo(() => {
    if (sectionFromUrl && availableSectionValues.includes(sectionFromUrl)) return sectionFromUrl;
    return null;
  }, [sectionFromUrl, availableSectionValues]);

  const [userSelectedTab, setUserSelectedTab] = useState('profile');

  const activeTab = useMemo(() => {
    if (urlDrivenTab) return urlDrivenTab;
    if (availableSectionValues.includes(userSelectedTab)) return userSelectedTab;
    return availableSectionValues[0] || 'profile';
  }, [urlDrivenTab, userSelectedTab, availableSectionValues]);

  const setActiveTab = useCallback(
    (tab) => {
      if (!availableSectionValues.includes(tab)) return;
      setUserSelectedTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [availableSectionValues, pathname, router, searchParams]
  );

  const businessId = business?.id;

  const refreshTeam = useCallback(async () => {
    const id = business?.id;
    if (!id) return;
    try {
      const members = await businessAPI.getUsers(id);
      setTeam(members || []);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    }
  }, [business?.id]);

  useEffect(() => {
    if (!businessId) {
      queueMicrotask(() => {
        setTeam([]);
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const members = await businessAPI.getUsers(businessId);
        if (!cancelled) setTeam(members || []);
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch team:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !business?.id) {
      toast.error('Enter member email first');
      return;
    }

    setTeamBusy(true);
    try {
      await businessAPI.addMember(business.id, inviteEmail.trim(), inviteRole);
      toast.success('Member added successfully');
      setInviteEmail('');
      setInviteRole('salesperson');
      await refreshTeam();
    } catch (error) {
      toast.error(error.message || 'Failed to add member');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRoleUpdate = async (member, nextRole) => {
    if (!business?.id || !member?.user_id) return;
    setTeamBusy(true);
    try {
      await businessAPI.updateUserRole(member.user_id, business.id, nextRole);
      toast.success('Role updated');
      await refreshTeam();
    } catch (error) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!business?.id || !member?.user_id) return;
    setTeamBusy(true);
    try {
      await businessAPI.removeMember(business.id, member.user_id);
      toast.success('Member removed');
      await refreshTeam();
    } catch (error) {
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!business?.id) return;
    if (!createEmail.trim()) {
      toast.error('Enter the new user\'s email');
      return;
    }
    if (!createPassword || createPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreateBusy(true);
    try {
      const res = await createTeamMemberWithPassword({
        businessId: business.id,
        email: createEmail.trim(),
        password: createPassword,
        name: createName.trim(),
        role: createRole,
      });
      if (res.success) {
        toast.success(res.message || 'Login created');
        setCreateEmail('');
        setCreateName('');
        setCreatePassword('');
        setCreateRole('salesperson');
        await refreshTeam();
      } else {
        toast.error(res.error || 'Failed to create login');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create login');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSetPassword = async () => {
    if (!business?.id || !pwdMember?.user_id) return;
    if (!pwdValue || pwdValue.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPwdSetBusy(true);
    try {
      const res = await resetTeamMemberPassword({
        businessId: business.id,
        targetUserId: pwdMember.user_id,
        newPassword: pwdValue,
      });
      if (res.success) {
        toast.success(res.message || 'Password updated');
        setPwdMember(null);
        setPwdValue('');
      } else {
        toast.error(res.error || 'Failed to set password');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to set password');
    } finally {
      setPwdSetBusy(false);
    }
  };

  useEffect(() => {
    const pkg = getPackagingFromSettings(business?.settings);
    const mode = pkg?.mode === 'custom' ? 'custom' : 'tier';
    const tier = resolvePlanTier(business?.plan_tier || 'free');
    const tierFeatures = PLAN_TIERS[tier]?.features || {};
    const seeded = Object.fromEntries(
      PLAN_FEATURE_TOGGLE_KEYS.map((key) => [key, Boolean(tierFeatures[key])])
    );
    queueMicrotask(() => {
      setLocalPackagingMode(mode);
      if (mode === 'custom' && pkg?.feature_overrides) {
        setLocalFeatureOverrides({ ...seeded, ...pkg.feature_overrides });
      } else {
        setLocalFeatureOverrides(seeded);
      }
    });
  }, [business?.id, business?.settings, business?.plan_tier]);

  const handleSavePackaging = async () => {
    if (!business?.id) return;
    setPackagingBusy(true);
    try {
      const res = await updateOwnerBusinessPackagingAction({
        businessId: business.id,
        mode: localPackagingMode,
        featureOverrides: localPackagingMode === 'custom' ? localFeatureOverrides : undefined,
      });
      if (!res.success) {
        toast.error(res.error || 'Could not save module access');
        return;
      }
      if (res.business) updateBusiness(res.business);
      toast.success(
        localPackagingMode === 'custom'
          ? 'Custom module access saved for this business.'
          : 'Module access now follows your subscription tier only.'
      );
    } catch (e) {
      toast.error(e.message || 'Could not save module access');
    } finally {
      setPackagingBusy(false);
    }
  };

  const handlePlanUpdate = async (tier) => {
    if (!business?.id) return;
    const currentTier = resolvePlanTier(business.plan_tier || 'free');
    const targetTier = resolvePlanTier(tier);
    if (currentTier === targetTier) return;

    if (targetTier === 'enterprise') {
      window.open(getBookMeetingHref(), '_blank', 'noopener,noreferrer');
      toast.success('Opening enterprise scheduling. We will scope your package on the call.');
      return;
    }

    const isElevation = (PLAN_ORDER[targetTier] ?? 0) > (PLAN_ORDER[currentTier] ?? 0);
    const useStripeCheckout =
      stripeCheckoutAvailable && targetTier !== 'free' && isElevation && !isPlatformOwner;

    setPlanBusy(true);
    try {
      if (useStripeCheckout) {
        await initiateCheckout({ planTier: targetTier });
        return;
      }
      const updated = await businessAPI.updatePlan(business.id, targetTier);
      updateBusiness(updated);
      toast.success(`Plan updated to ${PLAN_TIERS[targetTier]?.name || targetTier}`);
      await fetchSubscription();
    } catch (error) {
      toast.error(error.message || 'Failed to update plan');
    } finally {
      setPlanBusy(false);
    }
  };

  const handlePackageCheckout = async (packageKey) => {
    if (!business?.id || !packageKey) return;
    setPackageBusy(true);
    try {
      await initiateCheckout({ domainPackageKey: packageKey });
      const refreshed = await businessAPI.getById(business.id);
      updateBusiness(refreshed);
      await fetchSubscription();
    } catch (error) {
      toast.error(error.message || 'Could not start checkout for this suite');
    } finally {
      setPackageBusy(false);
    }
  };

  const handlePayOfflinePackage = (packageKey) => {
    setOfflinePackageKey(packageKey);
    requestAnimationFrame(() => {
      manualPaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    toast.success('Offline payment form ready. Submit your transaction ID below.');
  };

  const billingActionBusy = planBusy || packageBusy || isRedirecting;

  const persistSettingsPatch = useCallback(
    async (mutate) => {
      if (!business?.id) return;
      setSettingsPrefBusy(true);
      try {
        const base =
          business.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
            ? { ...business.settings }
            : {};
        mutate(base);
        const updated = await businessAPI.update(business.id, { settings: base });
        updateBusiness(updated);
      } catch (error) {
        toast.error(error.message || 'Could not save preferences');
      } finally {
        setSettingsPrefBusy(false);
      }
    },
    [business, updateBusiness]
  );

  const setAutomationLowStock = (checked) => {
    persistSettingsPatch((s) => {
      s.automation = { ...(s.automation && typeof s.automation === 'object' ? s.automation : {}), lowStockAlerts: checked };
    });
  };

  const setAutomationInvoiceSms = (checked) => {
    persistSettingsPatch((s) => {
      s.automation = { ...(s.automation && typeof s.automation === 'object' ? s.automation : {}), invoiceSms: checked };
    });
  };

  const setMultiCurrencyPref = (checked) => {
    persistSettingsPatch((s) => {
      s.domain_defaults = {
        ...(s.domain_defaults && typeof s.domain_defaults === 'object' ? s.domain_defaults : {}),
        multiCurrency: checked,
      };
    });
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      if (business?.id) {
        const settingsPayload =
          business?.settings && typeof business.settings === 'object' && !Array.isArray(business.settings)
            ? { ...business.settings }
            : {};
        const updated = await businessAPI.update(business.id, {
          business_name: formData.businessName,
          ntn: formData.ntn,
          srn: formData.srn?.trim() ? formData.srn.trim() : null,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          settings: settingsPayload,
        });
        updateBusiness(updated);
        if (updated) {
          setFormData({
            businessName: updated.business_name || '',
            ntn: updated.ntn || '',
            srn: updated.srn || '',
            phone: updated.phone || '',
            email: updated.email || '',
            address: updated.address || '',
            city: updated.city || 'Karachi',
          });
        }
        toast.success('Business profile updated successfully');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwdCurrent) {
      toast.error('Enter your current password');
      return;
    }
    if (!pwdNew || pwdNew.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setPwdBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        revokeOtherSessions: true,
      });
      if (error) toast.error(error.message || 'Could not update password');
      else {
        toast.success('Password updated');
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      }
    } catch (e) {
      toast.error(e.message || 'Could not update password');
    } finally {
      setPwdBusy(false);
    }
  };

  const openTwoFactorSetup = () => {
    setTfStep('password');
    setTfPassword('');
    setTfTotpUri('');
    setTfBackupCodes([]);
    setTfVerifyCode('');
    setTfDialogOpen(true);
  };

  const handleTwoFactorEnableRequest = async () => {
    if (!tfPassword) {
      toast.error('Enter your account password');
      return;
    }
    setTfBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({
        password: tfPassword,
        issuer: 'Tenvo',
      });
      if (error) {
        toast.error(error.message || 'Could not start 2FA setup');
        return;
      }
      if (data?.totpURI) setTfTotpUri(data.totpURI);
      if (Array.isArray(data?.backupCodes)) setTfBackupCodes(data.backupCodes);
      setTfStep('verify');
      toast.success('Add the key in your authenticator app, then enter a 6-digit code to finish.');
    } catch (e) {
      toast.error(e.message || 'Could not start 2FA setup');
    } finally {
      setTfBusy(false);
    }
  };

  const handleTwoFactorVerifyComplete = async () => {
    if (!tfVerifyCode || tfVerifyCode.trim().length < 6) {
      toast.error('Enter the 6-digit code from your authenticator');
      return;
    }
    setTfBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: tfVerifyCode.trim(),
        trustDevice: true,
      });
      if (error) toast.error(error.message || 'Invalid code');
      else {
        toast.success('Two-factor authentication is enabled');
        setTfDialogOpen(false);
        setTfPassword('');
        setTfVerifyCode('');
        if (typeof refetchSession === 'function') await refetchSession();
      }
    } catch (e) {
      toast.error(e.message || 'Verification failed');
    } finally {
      setTfBusy(false);
    }
  };

  const handleTwoFactorDisable = async () => {
    if (!tfDisablePassword) {
      toast.error('Enter your password to disable 2FA');
      return;
    }
    setTfBusy(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password: tfDisablePassword });
      if (error) toast.error(error.message || 'Could not disable 2FA');
      else {
        toast.success('Two-factor authentication disabled');
        setTfDisableOpen(false);
        setTfDisablePassword('');
        if (typeof refetchSession === 'function') await refetchSession();
      }
    } catch (e) {
      toast.error(e.message || 'Could not disable 2FA');
    } finally {
      setTfBusy(false);
    }
  };

  const refreshSampleDataState = useCallback(async () => {
    if (!business?.id) return;
    const res = await getBusinessSampleDataStateAction(business.id);
    if (res.success) setSampleDataState(res.data);
  }, [business?.id]);

  useEffect(() => {
    refreshSampleDataState();
  }, [refreshSampleDataState]);

  const handleLoadSampleData = async (replace = false) => {
    if (!business?.id) return;
    setLoadingTools(true);
    try {
      const countryIso = regionalStandards?.countryCode || 'PK';
      const result = await loadBusinessSampleDataAction({
        businessId: business.id,
        domainKey: category,
        countryIso,
        replace,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to load sample data');
      }

      if (result.data?.skipped) {
        toast(result.message || result.data.message || 'Sample data already loaded', { icon: 'ℹ️' });
        setLoadSampleOpen(false);
        return;
      }

      toast.success(result.data?.message || 'Sample workspace loaded');
      setLoadSampleOpen(false);
      await refreshSampleDataState();
    } catch (error) {
      console.error('Sample data load error:', error);
      toast.error(error.message || 'Failed to load sample data');
    } finally {
      setLoadingTools(false);
    }
  };

  const handleRemoveSampleData = async () => {
    if (!business?.id) return;
    setLoadingTools(true);
    try {
      const result = await removeBusinessSampleDataAction({ businessId: business.id });
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove sample data');
      }
      toast.success(result.data?.message || 'Sample data removed');
      setRemoveSampleOpen(false);
      await refreshSampleDataState();
    } catch (error) {
      console.error('Sample data remove error:', error);
      toast.error(error.message || 'Failed to remove sample data');
    } finally {
      setLoadingTools(false);
    }
  };

  const handleLoadTemplateData = () => setLoadSampleOpen(true);

  if (business?.id !== formSyncedBusinessId) {
    setFormSyncedBusinessId(business?.id ?? null);
    setFormData(buildProfileFormData(business));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Enterprise Settings</h2>
          <p className="mt-1 text-sm text-gray-500 font-medium leading-snug">
            Configure your cloud ERP, compliance, billing, and team, scoped to this business.
          </p>
        </div>
        <div
          className="flex flex-row flex-nowrap items-stretch sm:items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 lg:mx-0 lg:px-0 lg:shrink-0 [scrollbar-width:thin]"
          role="toolbar"
          aria-label="Workspace actions"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/multi-business')}
            className="h-10 sm:h-11 shrink-0 rounded-xl font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3 sm:px-4"
          >
            <ArrowLeftRight className="w-4 h-4 sm:mr-2 text-wine shrink-0" />
            <span className="hidden sm:inline">Switch Business</span>
            <span className="sm:hidden text-xs font-semibold">Switch</span>
          </Button>

          {canManageBilling && (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/register')}
              className="h-10 sm:h-11 shrink-0 rounded-xl font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3 sm:px-4"
            >
              <PlusCircle className="w-4 h-4 sm:mr-2 text-wine shrink-0" />
              <span className="hidden sm:inline">Launch New Entity</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleProfileSave}
            disabled={isSaving || !business?.id}
            className="h-10 sm:h-11 shrink-0 font-semibold shadow-md shadow-emerald-900/10 rounded-xl px-4 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 sm:mr-2 animate-spin shrink-0" />
            ) : (
              <Save className="w-4 h-4 sm:mr-2 shrink-0" />
            )}
            <span className="whitespace-nowrap">Save Changes</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
              <UserCog className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Access level</p>
              <p className="mt-1 text-lg font-bold text-slate-900 capitalize tabular-nums">{roleLabel}</p>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {canManageBilling
                  ? 'Owner controls subscription, seats, and entity expansion.'
                  : 'Manage users, access, and operational settings within your role.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <CreditCard className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current plan</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{PLAN_TIERS[planTier]?.name || 'Free'}</p>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {canManageBilling ? 'Upgrade seats and modules under the Billing tab.' : 'Billing is managed by the business owner.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Users className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active team</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{activeTeamCount}</p>
              <p className="mt-1.5 text-xs text-slate-600 leading-snug">
                {canManageUsers ? 'Roles and seats are managed in the Team tab.' : 'Visible to admins and owners only.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-nowrap sm:flex-wrap justify-start gap-1 overflow-x-auto pb-1 bg-slate-100/90 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-200/70 [scrollbar-width:thin]">
          {visibleSections.map(section => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="shrink-0 rounded-full sm:rounded-xl font-semibold text-xs sm:text-sm px-3.5 py-2 text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:shadow-none hover:text-slate-900"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wine/10 text-wine ring-1 ring-wine/15">
                  <Building2 className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    Identity &amp; branding
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Legal name, contact, and location used on invoices, emails, and regulatory filings.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Legal Business Name</Label>
                  <Input
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Support Email</Label>
                  <Input
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Primary Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <CityAutocomplete
                    value={formData.city}
                    onChange={val => setFormData({ ...formData, city: val })}
                    required={true}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Registered Office Address</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-sky-50/80 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 ring-1 ring-sky-200/80">
                  <Shield className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">FBR &amp; tax identifiers</CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Official tax numbers used on invoices and compliance exports. Saved with <span className="font-semibold text-slate-800">Save Changes</span>.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">NTN (7+1 digits)</Label>
                  <Input
                    value={formData.ntn}
                    onChange={e => setFormData({ ...formData, ntn: e.target.value })}
                    placeholder="1234567-8"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">STRN / SRN (sales tax)</Label>
                  <Input
                    value={formData.srn}
                    onChange={e => setFormData({ ...formData, srn: e.target.value })}
                    placeholder="Enter STRN if applicable"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-100 flex items-start gap-4">
                <Globe className="w-5 h-5 text-sky-700 mt-0.5 shrink-0" aria-hidden />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">POS &amp; FBR integration</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Your workspace can be connected for Tier-1 reporting. Contact support when you are ready to complete SRS configuration for your region.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
                  <Zap className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Workflow automation</CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Preferences are saved to your business and applied where supported in the product.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="min-w-0">
                  <Label className="font-semibold text-slate-900">Low stock alerts</Label>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Highlight low inventory in dashboards and reminders where enabled.</p>
                </div>
                <Switch
                  checked={automationPrefs.lowStockAlerts}
                  disabled={settingsPrefBusy}
                  onCheckedChange={setAutomationLowStock}
                />
              </div>
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="min-w-0">
                  <Label className="font-semibold text-slate-900">Invoice delivery (SMS / WhatsApp)</Label>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">When messaging integrations are available, use this preference to opt in.</p>
                </div>
                <Switch
                  checked={automationPrefs.invoiceSms}
                  disabled={settingsPrefBusy}
                  onCheckedChange={setAutomationInvoiceSms}
                />
              </div>
            </CardContent>
          </Card>
          {isPosRelevant(category, getDomainKnowledgeForBusiness(business)) && (
            <PosSettingsPanel category={category} />
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white ring-1 ring-slate-800">
                  <Shield className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Security &amp; access</CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Password and two-factor authentication for your sign-in (your user account, not per-business roles).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Change password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs font-semibold text-slate-600">Current password</Label>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={pwdCurrent}
                      onChange={e => setPwdCurrent(e.target.value)}
                      placeholder="Current password"
                      className="rounded-xl h-11 bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600">New password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={pwdNew}
                      onChange={e => setPwdNew(e.target.value)}
                      placeholder="At least 8 characters"
                      className="rounded-xl h-11 bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600">Confirm new password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={pwdConfirm}
                      onChange={e => setPwdConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      className="rounded-xl h-11 bg-white border-slate-200"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="rounded-xl h-11 px-6 font-semibold w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={pwdBusy}
                  onClick={handlePasswordChange}
                >
                  {pwdBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update password
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Two-factor authentication (2FA)</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Status:{' '}
                    <span className="font-semibold text-slate-800">{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</span>
                    . Use an authenticator app for stronger sign-in.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {!twoFactorEnabled ? (
                    <Button type="button" variant="default" className="rounded-xl font-semibold" onClick={openTwoFactorSetup}>
                      Set up 2FA
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl font-semibold border-slate-200"
                      onClick={() => {
                        setTfDisablePassword('');
                        setTfDisableOpen(true);
                      }}
                    >
                      Disable 2FA
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="financials" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80">
                  <CreditCard className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Financial configuration</CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Chart of accounts mapping and default currency for this business.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 uppercase tracking-widest">GL Account Mapping</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-600">Cash Account Code</Label>
                      <Input
                        value={business?.settings?.coa_mapping?.cash || '1001'}
                        onBlur={(e) => {
                          persistSettingsPatch((s) => {
                            s.coa_mapping = { ...(s.coa_mapping || {}), cash: e.target.value };
                          });
                        }}
                        onChange={(e) => {
                          updateBusiness({ settings: { ...(business?.settings || {}), coa_mapping: { ...(business?.settings?.coa_mapping || {}), cash: e.target.value } } });
                        }}
                        className="w-24 h-8 text-center font-mono text-xs rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-600">Receivable Code</Label>
                      <Input
                        value={business?.settings?.coa_mapping?.ar || '1100'}
                        onBlur={(e) => {
                          persistSettingsPatch((s) => {
                            s.coa_mapping = { ...(s.coa_mapping || {}), ar: e.target.value };
                          });
                        }}
                        onChange={(e) => {
                          updateBusiness({ settings: { ...(business?.settings || {}), coa_mapping: { ...(business?.settings?.coa_mapping || {}), ar: e.target.value } } });
                        }}
                        className="w-24 h-8 text-center font-mono text-xs rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-600">Sales Revenue Code</Label>
                      <Input
                        value={business?.settings?.coa_mapping?.revenue || '4000'}
                        onBlur={(e) => {
                          persistSettingsPatch((s) => {
                            s.coa_mapping = { ...(s.coa_mapping || {}), revenue: e.target.value };
                          });
                        }}
                        onChange={(e) => {
                          updateBusiness({ settings: { ...(business?.settings || {}), coa_mapping: { ...(business?.settings?.coa_mapping || {}), revenue: e.target.value } } });
                        }}
                        className="w-24 h-8 text-center font-mono text-xs rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 uppercase tracking-widest">Global Defaults</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-600">Base Currency</Label>
                      <select
                        value={business?.settings?.financials?.currency || 'PKR'}
                        onChange={(e) => {
                          const CURRENCY_SYMBOLS = { PKR: '₨', USD: '$', SAR: '﷼', AED: 'د.إ' };
                          const currency = e.target.value;
                          const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
                          persistSettingsPatch((s) => {
                            s.financials = { ...(s.financials || {}), currency, currencySymbol };
                          });
                        }}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                      >
                        <option value="PKR">Pakistani Rupee (PKR)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="SAR">Saudi Riyal (SAR)</option>
                        <option value="AED">UAE Dirham (AED)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                      <div className="min-w-0">
                        <Label className="font-semibold text-emerald-950 text-xs">Multi-currency</Label>
                        <p className="text-[10px] text-emerald-800/90 leading-snug">Allow secondary currencies alongside your base currency where the product supports it.</p>
                      </div>
                      <Switch
                        checked={multiCurrencyEnabled}
                        disabled={settingsPrefBusy}
                        onCheckedChange={setMultiCurrencyPref}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 pt-4">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 ring-1 ring-slate-200/80">
                  <Users className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">Team management</CardTitle>
                  <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                    Invite members, assign roles, and control who can administer this workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-wine/10 bg-wine/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-wine/70">Access Control</p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {canManageBilling
                      ? 'Owners can assign operational roles, manage active seats, and control who administers this business.'
                      : 'Admins can invite users, change operational roles, and remove members. Owner membership and billing remain protected.'}
                  </p>
                </div>

                {/* Primary: add a member with email + password (works even if email/OTP delivery fails) */}
                <div className="space-y-3 rounded-2xl border border-wine/20 bg-white p-4 shadow-sm">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-wine" aria-hidden />
                      Add a team member
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Set the member&apos;s email and a password yourself. They can sign in immediately — no email confirmation or OTP needed. Share the password with them securely.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Email</Label>
                      <Input
                        placeholder="member@company.com"
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Full name (optional)</Label>
                      <Input
                        placeholder="Jane Doe"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Password (min 8 chars)</Label>
                      <Input
                        placeholder="Temporary password"
                        type="text"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Role</Label>
                      <select
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value)}
                        className="h-10 w-full px-3 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                      >
                        {['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer'].map(role => (
                          <option key={role} value={role}>{role.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCreateLogin}
                      disabled={createBusy}
                      className="bg-wine hover:bg-wine/90 text-[10px] font-semibold uppercase"
                    >
                      {createBusy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
                      Add member
                    </Button>
                  </div>
                </div>

                {/* Secondary: send an email invite instead (member sets their own password) */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <button
                    type="button"
                    onClick={() => setShowEmailInvite((v) => !v)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-4 h-4 text-wine" aria-hidden />
                      Or send an email invite
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-slate-500">{showEmailInvite ? 'Hide' : 'Show'}</span>
                  </button>
                  {showEmailInvite && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 font-medium">Sends a secure invite link. The member sets their own password when they accept.</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input
                          placeholder="member@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="md:col-span-2"
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                        >
                          {['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer'].map(role => (
                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={handleInviteMember}
                          disabled={teamBusy}
                          className="bg-white text-wine border border-wine/30 hover:bg-wine/5 text-[10px] font-semibold uppercase"
                        >
                          Send invite
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-widest">Active Members</h4>

                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">User Email</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Role</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {team.length > 0 ? team.filter(m => m.status === 'active').map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">{member.user?.email || 'Unknown User'}</td>
                          <td className="px-6 py-4">
                            {member.role === 'owner' ? (
                              <Badge variant="outline" className="capitalize font-semibold text-[10px] py-1 px-3 rounded-full border-wine/20 text-wine bg-wine/5">
                                {member.role}
                              </Badge>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleUpdate(member, e.target.value)}
                                disabled={teamBusy}
                                className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                              >
                                {['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer'].map(role => (
                                  <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                              <span className="text-xs font-bold text-gray-600 capitalize">{member.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.role === 'owner' ? (
                              <span className="text-[10px] font-semibold uppercase text-gray-400">Protected</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={teamBusy}
                                  onClick={() => { setPwdMember(member); setPwdValue(''); }}
                                  className="text-blue-600 font-semibold text-[10px] uppercase hover:bg-blue-50"
                                  title="Set password"
                                >
                                  <KeyRound className="w-3 h-3 mr-1" />
                                  Set password
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={teamBusy}
                                  onClick={() => handleRemoveMember(member)}
                                  className="text-rose-600 font-semibold text-[10px] uppercase hover:bg-rose-50"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">
                            No team members found. Only the business owner is active.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!pwdMember} onOpenChange={(open) => { if (!open) { setPwdMember(null); setPwdValue(''); } }}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  Set password
                </DialogTitle>
                <DialogDescription>
                  Set a new password for {pwdMember?.user?.email || 'this member'}. They can sign in with it immediately — useful when email or OTP delivery fails.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label>New password</Label>
                <Input
                  type="text"
                  value={pwdValue}
                  onChange={(e) => setPwdValue(e.target.value)}
                  placeholder="At least 8 characters"
                  className="rounded-xl"
                  minLength={8}
                />
                <p className="text-xs text-slate-500">Share this password with the member through a secure channel.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setPwdMember(null); setPwdValue(''); }} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleSetPassword}
                  disabled={pwdSetBusy}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {pwdSetBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Set password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4 pt-4">
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
              <CardTitle className="text-indigo-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Subscription & Plan
              </CardTitle>
              <CardDescription>Select a plan based on seats and required capabilities</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 relative">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${billingActionBusy ? 'pointer-events-none opacity-70' : ''}`}>
                {Object.entries(PLAN_TIERS).map(([tier, config]) => {
                  const selected = (business?.plan_tier || 'free') === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handlePlanUpdate(tier)}
                      disabled={billingActionBusy}
                      className={`text-left rounded-2xl border p-4 transition-all ${selected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{config.name}</span>
                        {selected && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-white/80 px-2 py-0.5 rounded-full border border-indigo-200">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{config.tagline}</p>
                      <p className="text-xs font-semibold text-indigo-700 mt-2">PKR {config.price_pkr}/mo</p>
                      <p className="text-[11px] text-gray-600 mt-2">Seats: {config.limits.max_users === -1 ? 'Unlimited' : config.limits.max_users}</p>
                    </button>
                  );
                })}
              </div>
              {billingActionBusy ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden />
                </div>
              ) : null}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm font-medium text-indigo-900">
                {devInstantBilling
                  ? 'Development billing: plan changes apply immediately without Stripe when card checkout is unavailable. Offline payment and admin approval still work for testing.'
                  : stripeCheckoutAvailable
                    ? 'Paid upgrades use Stripe Checkout (dynamic pricing, no dashboard Price IDs). You can also pay offline via JazzCash, EasyPaisa, or bank below.'
                    : 'Paid upgrades go through Stripe Checkout when configured. Downgrades and the Free tier can be applied directly here. Offline payment is available below.'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-violet-50/70 border-b border-violet-100">
              <CardTitle className="text-violet-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Industry packages
              </CardTitle>
              <CardDescription>
                Vertical suites with tailored modules, limits, and storefront defaults. Same billing paths as standard plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 relative">
              <DomainPackageBillingCards
                businessSettings={business?.settings}
                stripeCheckoutAvailable={stripeCheckoutAvailable}
                devInstantBilling={devInstantBilling}
                busy={packageBusy}
                isRedirecting={isRedirecting}
                onCheckout={handlePackageCheckout}
                onPayOffline={handlePayOfflinePackage}
              />
              {billingActionBusy ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" aria-hidden />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-emerald-50/60 border-b border-emerald-100">
              <CardTitle className="text-emerald-950 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                Payment options
              </CardTitle>
              <CardDescription>Offline wallets, bank transfer, and sales-assisted billing</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {business?.id ? (
                <div ref={manualPaymentRef}>
                  <ManualPaymentRequestPanel
                    businessId={business.id}
                    devBillingMode={devInstantBilling}
                    preferredDomainPackageKey={offlinePackageKey}
                    onSubmitted={() => {
                      void fetchSubscription();
                    }}
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
                <span className="font-semibold">Enterprise or custom packaging?</span>{' '}
                <a
                  href={getBookMeetingHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                >
                  Book a meeting
                </a>{' '}
                with sales to scope volume, SLA, and white-label options.
              </div>
            </CardContent>
          </Card>

          {canOwnerPackaging ? (
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-slate-600" />
                  Custom module access (owner)
                </CardTitle>
                <CardDescription>
                  By default, hubs and server checks use your <strong>subscription tier</strong>. Turn on{' '}
                  <strong>custom packaging</strong> only when you need to grant or hide specific modules for this
                  workspace (for example a negotiated pilot). Seat and inventory limits still follow your plan tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 relative">
                <div className={`space-y-4 ${packagingBusy ? 'pointer-events-none opacity-70' : ''}`}>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Custom module toggles</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Off = use plan tier only. On = per-feature switches below override tier defaults for this
                        business.
                      </p>
                    </div>
                    <Switch
                      checked={localPackagingMode === 'custom'}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const t = resolvePlanTier(business?.plan_tier || 'free');
                          const tierFeatures = PLAN_TIERS[t]?.features || {};
                          const seeded = Object.fromEntries(
                            PLAN_FEATURE_TOGGLE_KEYS.map((key) => [key, Boolean(tierFeatures[key])])
                          );
                          const existing = getPackagingFromSettings(business?.settings)?.feature_overrides;
                          setLocalFeatureOverrides({ ...seeded, ...(existing || {}) });
                          setLocalPackagingMode('custom');
                        } else {
                          setLocalPackagingMode('tier');
                        }
                      }}
                      aria-label="Enable custom module packaging"
                    />
                  </div>

                  {localPackagingMode === 'custom' ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 max-h-[22rem] overflow-y-auto pr-1">
                      <div className="divide-y divide-slate-100">
                        {PLAN_FEATURE_TOGGLE_KEYS.map((key) => {
                          const label = FEATURE_LABELS[key] || key.replace(/_/g, ' ');
                          const val = !!localFeatureOverrides[key];
                          const minPlan = FEATURE_MIN_PLAN[key];
                          const isEnterpriseOnly = enterpriseOnlyFeatureKeys.has(key);
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/80"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-slate-800">{label}</span>
                                {isEnterpriseOnly ? (
                                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                                    {minPlan === 'business' ? 'Business+' : 'Enterprise'}
                                  </span>
                                ) : null}
                              </div>
                              <Switch
                                checked={val}
                                onCheckedChange={(v) =>
                                  setLocalFeatureOverrides((prev) => ({
                                    ...prev,
                                    [key]: v,
                                  }))
                                }
                                aria-label={label}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleSavePackaging}
                      disabled={packagingBusy}
                      className="rounded-xl font-semibold"
                    >
                      {packagingBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save module access
                    </Button>
                  </div>
                </div>
                {packagingBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-[1px]">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-600" aria-hidden />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                Plan usage limits
              </CardTitle>
              <CardDescription>
                Effective caps for this workspace from your{' '}
                <strong>{PLAN_TIERS[billingLimitSnapshot.tier]?.name || billingLimitSnapshot.tier}</strong>{' '}
                subscription{Object.keys(billingLimitSnapshot.overriddenKeys).length > 0
                  ? ', including platform adjustments'
                  : ''}
                . Contact support to request limit changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="hidden sm:grid sm:grid-cols-3 gap-2 px-4 py-2 bg-slate-100/80 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  <span>Limit</span>
                  <span>Plan default</span>
                  <span>Your limit</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {PLAN_LIMIT_OVERRIDE_KEYS.map((key) => {
                    const label = LIMIT_OVERRIDE_LABELS[key] || key.replace(/max_/, '').replace(/_/g, ' ');
                    const tierDefault = billingLimitSnapshot.tierDefaults[key];
                    const effective = billingLimitSnapshot.effective[key];
                    const isOverridden = billingLimitSnapshot.overriddenKeys[key] !== undefined;
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 px-4 py-3 bg-white"
                      >
                        <span className="text-xs font-medium text-slate-800">{label}</span>
                        <span className="text-xs text-slate-500">{formatPlanLimitValue(tierDefault)}</span>
                        <span className={`text-xs font-semibold ${isOverridden ? 'text-indigo-700' : 'text-slate-800'}`}>
                          {formatPlanLimitValue(effective)}
                          {isOverridden ? (
                            <span className="ml-1.5 text-[10px] font-normal text-indigo-600">(adjusted)</span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl border-t-4 border-t-wine-500 overflow-hidden">
              <CardHeader className="bg-wine-50/60">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-wine-600" />
                  Business Maintenance
                </CardTitle>
                <CardDescription>Advanced tools for quick data setup and maintenance</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="p-4 bg-wine-50/40 rounded-2xl border border-wine-100 flex items-start gap-4">
                  <div className="p-3 bg-wine-100 rounded-xl text-wine-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-tighter">Learning workspace</h4>
                      {sampleDataState?.loaded ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Sample data active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600">Empty workspace</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 mb-2">
                      Load a full {category.replace(/-/g, ' ')} sample, products with images, customers, warehouses,
                      invoices, payments, payroll, and transfers, to explore Tenvo before entering your own data.
                      Your real records are never mixed in; sample rows are tagged and removable.
                    </p>
                    {sampleDataState?.loadedAt ? (
                      <p className="text-[11px] text-slate-500 mb-3">
                        Loaded {new Date(sampleDataState.loadedAt).toLocaleString()}
                        {sampleDataState.sampleProductCount != null
                          ? ` · ${sampleDataState.sampleProductCount} sample products`
                          : ''}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setLoadSampleOpen(true)}
                        disabled={loadingTools}
                        className="bg-wine-600 hover:bg-wine-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-wine-200"
                      >
                        {loadingTools ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDriveDownload className="w-4 h-4 mr-2" />}
                        {sampleDataState?.loaded ? 'Reload sample data' : 'Load sample data'}
                      </Button>
                      {sampleDataState?.canRemove ? (
                        <Button
                          variant="outline"
                          onClick={() => setRemoveSampleOpen(true)}
                          disabled={loadingTools}
                          className="border-red-200 text-red-700 hover:bg-red-50 font-bold h-11 px-6 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove sample data
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                  <strong className="text-slate-800">Tip:</strong> New accounts start empty with your industry categories and
                  intelligence presets. Use sample data to learn the system, then remove it and add your own catalog when ready.
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl border-t-4 border-t-blue-500 overflow-hidden">
              <CardHeader className="bg-blue-50/50">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  Cloud Expansion
                </CardTitle>
                <CardDescription>Scale your operations by adding new business entities</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-tighter">Launch New Entity</h4>
                    <p className="text-xs text-blue-700 font-medium mt-1 mb-4">
                      Create a new legal entity or branch. Every business gets its own independent database, domains, and team.
                    </p>
                    <Button
                      onClick={() => router.push('/register')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-200"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Register New Entity
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl text-gray-600 shadow-sm">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-tighter">Switch Business</h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 mb-4">
                      Seamlessly jump between your different business subsidiaries and domains.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/multi-business')}
                      className="h-11 px-6 rounded-xl font-bold border-gray-200 hover:bg-gray-100"
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      View All Entities
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={tfDialogOpen}
        onOpenChange={(open) => {
          setTfDialogOpen(open);
          if (!open) {
            setTfStep('password');
            setTfPassword('');
            setTfTotpUri('');
            setTfBackupCodes([]);
            setTfVerifyCode('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tfStep === 'password' ? 'Enable two-factor authentication' : 'Verify authenticator'}</DialogTitle>
            <DialogDescription>
              {tfStep === 'password'
                ? 'Enter your account password to generate a setup key and backup codes.'
                : 'Add the key to your authenticator app, then enter the 6-digit code to finish.'}
            </DialogDescription>
          </DialogHeader>
          {tfStep === 'password' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Account password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={tfPassword}
                  onChange={e => setTfPassword(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              {tfBackupCodes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-800 mb-2">Save these backup codes once</p>
                  <ul className="text-xs font-mono text-slate-700 space-y-0.5 max-h-32 overflow-y-auto">
                    {tfBackupCodes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tfTotpUri ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Setup key (otpauth URI)</Label>
                  <Textarea readOnly value={tfTotpUri} className="text-xs font-mono min-h-[80px] rounded-xl" />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">6-digit code</Label>
                <Input
                  value={tfVerifyCode}
                  onChange={e => setTfVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="rounded-xl h-11 tracking-widest font-mono"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {tfStep === 'password' ? (
              <>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setTfDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="rounded-xl" onClick={handleTwoFactorEnableRequest} disabled={tfBusy}>
                  {tfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setTfStep('password')} disabled={tfBusy}>
                  Back
                </Button>
                <Button type="button" className="rounded-xl" onClick={handleTwoFactorVerifyComplete} disabled={tfBusy}>
                  {tfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & enable'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tfDisableOpen}
        onOpenChange={(open) => {
          setTfDisableOpen(open);
          if (!open) setTfDisablePassword('');
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication</DialogTitle>
            <DialogDescription>Enter your account password to turn off 2FA for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold text-slate-700">Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={tfDisablePassword}
              onChange={e => setTfDisablePassword(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setTfDisableOpen(false)} disabled={tfBusy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="rounded-xl" onClick={handleTwoFactorDisable} disabled={tfBusy}>
              {tfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadSampleOpen} onOpenChange={setLoadSampleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Load sample workspace?</DialogTitle>
            <DialogDescription>
              This adds realistic {category.replace(/-/g, ' ')} demo products, customers, warehouses, invoices, payroll, and
              more so you can explore every module. Sample rows are tagged, remove them anytime without affecting your settings
              or chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLoadSampleOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-wine-600 hover:bg-wine-700"
              disabled={loadingTools}
              onClick={() => handleLoadSampleData(Boolean(sampleDataState?.loaded))}
            >
              {loadingTools ? <Loader2 className="w-4 h-4 animate-spin" /> : sampleDataState?.loaded ? 'Replace sample data' : 'Load sample data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeSampleOpen} onOpenChange={setRemoveSampleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove sample data?</DialogTitle>
            <DialogDescription>
              Deletes all tagged sample products, customers, transactions, warehouses, and payroll records. Your category
              templates, domain settings, and GL accounts stay intact. Add your own data when you are ready.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setRemoveSampleOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="rounded-xl" disabled={loadingTools} onClick={handleRemoveSampleData}>
              {loadingTools ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove sample data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
