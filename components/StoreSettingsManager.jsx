'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';
import { Textarea } from '@/components/ui/textarea';
import { 
  Store, Globe, Link2, Palette, Truck, CreditCard, 
  Save, ExternalLink, ArrowRight, Upload, Image, RefreshCw,
  CheckCircle2, XCircle, Package, Info, Megaphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  getStorefrontSettings, updateBusinessSettings,
  configureStorefrontDomain, syncInventoryToStorefront
} from '@/lib/actions/storefront/admin';
import { MobileTabHeader } from '@/components/mobile/MobileTabHeader';
import { useStorefrontEmbedded } from '@/lib/context/StorefrontMobileContext';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { MarketingSectionsEditor } from '@/components/storefront/admin/MarketingSectionsEditor';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isAutoPartsStore } from '@/lib/storefront/autoParts';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import { isFurnitureElevatedStore } from '@/lib/storefront/furnitureStorefront';
import { isFitnessElevatedStore } from '@/lib/storefront/fitnessStorefront';
import { isFashionEditorialStore } from '@/lib/storefront/fashionEditorial';
import { canConfigureTenantMeetingUrl, normalizeTenantMeetingUrl } from '@/lib/storefront/storefrontBooking';

// ── Image Upload Field ────────────────────────────────────────────────────────
function ImageUploadField({ label, hint, value, onChange, businessId }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!businessId) {
      toast.error('Business context is required to upload images');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('businessId', businessId);
      const res = await fetch('/api/upload/product-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        onChange(data.url);
        toast.success('Image uploaded');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 overflow-hidden shrink-0"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Image className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => onChange('')}
            >
              Remove
            </Button>
          )}
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export function StoreSettingsManager({ business, category }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadedPlanTier, setLoadedPlanTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const [settings, setSettings] = useState({
    enabled: true,
    theme: 'default',
    currency: 'PKR',
    enableCOD: true,
    enableCard: true,
    freeShippingThreshold: 2000,
    returnPolicyDays: 7,
    heroTitle: '',
    heroSubtitle: '',
    announcement: '',
    pageSections: [],
    brand: { primaryColor: '' },
    socialLinks: { facebook: '', instagram: '', twitter: '', youtube: '' },
    logoUrl: '',
    coverImageUrl: '',
    description: '',
    publicEmail: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    businessHours: '',
    website: '',
    storeDomain: null,
    storeUrl: null,
    products: { total: 0, active: 0 },
    setupStatus: null,
    ownerLoginEmail: '',
    marketplace: {
      heroPromo: { eyebrow: '', title: '', subtitle: '', ctaLabel: '', ctaHref: '', image: '' },
      coeTicker: { label: '', value: '', change: '', href: '' },
      showForum: false,
      showArticles: false,
      showEShop: true,
    },
    dealership: {
      profile: 'tenvo-vehicles',
      tagline: '',
      welcomeTitle: '',
      uan: '',
      videoUrl: '',
      showTrustStrip: true,
      showMarketingBanners: true,
      trustStrip: { hours: '', shippingLabel: '', ratingLabel: '' },
    },
    autoParts: {
      showPromoCards: true,
      showFeaturedCategories: true,
      showFeaturedDeals: true,
      showVehicleBrands: true,
      showTrending: true,
      showTrustSection: true,
      showCategoryRails: true,
      showMarketingBanners: true,
      trustTitle: '',
      trustSubtitle: '',
      ctaTitle: '',
      ctaSubtitle: '',
      ctaLabel: '',
    },
    restaurant: {
      showCuisineCarousel: true,
      showSuperPicks: true,
      showOrderModes: true,
      showRewardsCta: false,
      showDeliveryInfo: true,
      locationLabel: 'Deliver to',
      defaultLocation: '',
      searchPlaceholder: '',
      cateringLabel: 'Catering',
      featuredRailTitle: '',
      featuredRailSubtitle: '',
    },
    pharmacy: {
      showRefillPromo: true,
      showBrandsRow: true,
      showSeoBlock: false,
      locationLabel: 'Deliver to',
      defaultLocation: '',
      searchPlaceholder: '',
      featuredRailTitle: '',
      featuredRailSubtitle: '',
    },
    furniture: {
      showRoomTiles: true,
      showTestimonials: false,
      showShowroomCta: true,
      locationLabel: 'Deliver to',
      defaultLocation: '',
      searchPlaceholder: '',
      showroomLabel: 'Visit showroom',
      featuredRailTitle: '',
      featuredRailSubtitle: '',
    },
    fitness: {
      showPrograms: true,
      showMemberships: true,
      showBenefits: true,
      showTrainers: false,
      showBookingStrip: true,
      showPromoBanners: true,
      showTrustPillars: false,
      heroTitle: '',
      heroSubtitle: '',
      searchPlaceholder: '',
      supplementRailTitle: '',
      featuredRailTitle: '',
      featuredRailSubtitle: '',
      membershipSectionTitle: '',
      membershipSectionSubtitle: '',
    },
    booking: {
      meetingUrl: '',
    },
    fashion: {
      animations: true,
      showHeroRating: true,
      showTopCollections: true,
      showTopPicks: true,
      showEditorialSpotlight: true,
      showUnstitched: true,
      showReadyToWear: true,
      showAccessories: true,
      showOffers: true,
      showNewArrivals: true,
      unstitchedTitle: '',
      readyToWearTitle: '',
      accessoriesTitle: '',
      offersTitle: '',
      newArrivalsTitle: '',
    },
  });

  const marketplaceStore = isAutoMarketplaceStore(category || business?.category);
  const dealershipStore = isAutoDealershipStore(category || business?.category);
  const autoPartsStore = isAutoPartsStore(category || business?.category);
  const restaurantStore = isRestaurantElevatedStore(category || business?.category);
  const pharmacyStore = isPharmacyElevatedStore(category || business?.category);
  const furnitureStore = isFurnitureElevatedStore(category || business?.category);
  const fitnessStore = isFitnessElevatedStore(category || business?.category);
  const fashionStore = isFashionEditorialStore(category || business?.category);
  const businessForBookingGate = useMemo(
    () => ({
      ...business,
      plan_tier: loadedPlanTier || business?.plan_tier || business?.planTier || 'free',
      settings: business?.settings,
    }),
    [business, loadedPlanTier]
  );
  const showMeetingUrlField = canConfigureTenantMeetingUrl(
    businessForBookingGate,
    category || business?.category
  );

  useEffect(() => { loadSettings(); }, [business?.id]);

  const loadSettings = async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const result = await getStorefrontSettings(business.id);
      if (result.success && result.data) {
        setSettings(prev => ({ ...prev, ...result.data }));
        setNewDomain(result.data.storeDomain || '');
        setLoadedPlanTier(result.data.planTier || null);
      }
    } catch (err) {
      console.error('Failed to load store settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));
  const setMarketplace = (section, key, val) =>
    setSettings((prev) => ({
      ...prev,
      marketplace: {
        ...prev.marketplace,
        [section]: { ...(prev.marketplace?.[section] || {}), [key]: val },
      },
    }));
  const setMarketplaceFlag = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      marketplace: { ...prev.marketplace, [key]: val },
    }));
  const setDealership = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      dealership: { ...prev.dealership, [key]: val },
    }));
  const setDealershipTrust = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      dealership: {
        ...prev.dealership,
        trustStrip: { ...(prev.dealership?.trustStrip || {}), [key]: val },
      },
    }));
  const setAutoParts = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      autoParts: { ...(prev.autoParts || {}), [key]: val },
    }));
  const setRestaurant = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      restaurant: { ...(prev.restaurant || {}), [key]: val },
    }));
  const setPharmacy = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      pharmacy: { ...(prev.pharmacy || {}), [key]: val },
    }));
  const setFurniture = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      furniture: { ...(prev.furniture || {}), [key]: val },
    }));
  const setFitness = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      fitness: { ...(prev.fitness || {}), [key]: val },
    }));
  const setBooking = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      booking: { ...(prev.booking || {}), [key]: val },
    }));
  const setFashion = (key, val) =>
    setSettings((prev) => ({
      ...prev,
      fashion: { ...(prev.fashion || {}), [key]: val },
    }));
  const setSocialLink = (key, val) => setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: val } }));
  const setBrand = (key, val) => setSettings(prev => ({ ...prev, brand: { ...prev.brand, [key]: val } }));

  const handleSave = async () => {
    if (!business?.id) return;
    const rawMeetingUrl = settings.booking?.meetingUrl?.trim();
    if (showMeetingUrlField && rawMeetingUrl && !normalizeTenantMeetingUrl(rawMeetingUrl)) {
      toast.error('Scheduling URL must start with http:// or https://');
      return;
    }
    setSaving(true);
    try {
      const result = await updateBusinessSettings(business.id, settings);
      if (result.success) {
        toast.success('Store settings saved');
        loadSettings();
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!business?.id || !newDomain.trim()) return;
    const slug = newDomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setDomainSaving(true);
    try {
      const result = await configureStorefrontDomain(business.id, slug);
      if (result.success) {
        toast.success(`Store URL set to /store/${slug}`);
        loadSettings();
      } else {
        toast.error(result.error || 'Failed to set domain');
      }
    } catch {
      toast.error('Failed to set domain');
    } finally {
      setDomainSaving(false);
    }
  };

  const handleSyncInventory = async () => {
    if (!business?.id) return;
    setSyncing(true);
    try {
      const result = await syncInventoryToStorefront(business.id);
      if (result.success) {
        toast.success(`Synced ${result.synced || 0} products to store`);
        loadSettings();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const storeUrl = settings.storeUrl;
  const fullStoreUrl = storeUrl && typeof window !== 'undefined'
    ? `${window.location.origin}${storeUrl}`
    : storeUrl || null;
  const regional = getRegionalStandards(settings.country || business?.country);
  const phonePlaceholder = `${regional.phoneCode} …`;
  const setup = settings.setupStatus;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-400" />
      </div>
    );
  }

  const embeddedInStorefront = useStorefrontEmbedded();

  return (
    <div className="space-y-2 lg:space-y-5">
      {!embeddedInStorefront && (
        <MobileTabHeader
          icon={Store}
          iconClassName="bg-emerald-100 text-emerald-600"
          title="Online Store"
          subtitle={settings.enabled ? 'Store is live' : 'Store is offline'}
          primaryAction={{
            label: saving ? 'Saving…' : 'Save',
            icon: Save,
            className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            onClick: handleSave,
          }}
          actions={
            fullStoreUrl
              ? [{ id: 'view', label: 'View', icon: ExternalLink, onClick: () => window.open(storeUrl, '_blank', 'noopener,noreferrer') }]
              : []
          }
        />
      )}

      {embeddedInStorefront && (
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          )}>
            {settings.enabled ? 'Live' : 'Offline'}
          </span>
          <div className="flex gap-1">
            {fullStoreUrl && (
              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-[10px]" onClick={() => window.open(storeUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="mr-1 h-3 w-3" /> View
              </Button>
            )}
            <Button type="button" size="sm" className="h-8 bg-emerald-600 px-2.5 text-[10px] text-white hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Desktop header */}
      <div className="hidden items-center justify-between lg:flex">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-600" />
            Online Store
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Customize your public storefront</p>
        </div>
        <div className="flex items-center gap-2">
          {fullStoreUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View Store
              </Button>
            </a>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* ── Store Status Banner ──────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${settings.enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {settings.enabled
            ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
            : <XCircle className="w-4.5 h-4.5 text-gray-400" />}
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {settings.enabled ? 'Store is live' : 'Store is offline'}
            </p>
            <p className="text-xs text-gray-500">
              {settings.enabled
                ? `Customers can browse at ${fullStoreUrl || 'your store URL'}`
                : 'Your store is hidden from customers'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-gray-500">
            <span className="font-medium text-gray-700">{settings.products?.active ?? 0}</span> active products
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => set('enabled', v)}
          />
        </div>
      </div>

      {setup && setup.percent < 100 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-amber-900">Complete your storefront profile</p>
                <Badge variant="outline" className="border-amber-300 text-amber-800">
                  {setup.percent}% ready
                </Badge>
              </div>
              <p className="text-xs text-amber-800/90">
                Customers only see what you enter here, your login email stays private unless you add a public support address.
              </p>
              <ul className="space-y-1">
                {setup.nextSteps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2 text-xs text-amber-900">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {step.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="domain">Domain</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        {/* ── Branding Tab ────────────────────────────────────────────── */}
        <TabsContent value="branding" className="space-y-4 mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Image className="w-4 h-4" /> Store Images
              </CardTitle>
              <CardDescription>Logo and hero banner shown on your public store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploadField
                label="Store Logo"
                hint="Shown in header and emails. Recommended: 200×200px square."
                value={settings.logoUrl}
                onChange={(v) => set('logoUrl', v)}
                businessId={business?.id}
              />
              <Separator />
              <ImageUploadField
                label="Hero / Cover Image"
                hint="Full-width banner on your store homepage. Recommended: 1440×500px."
                value={settings.coverImageUrl}
                onChange={(v) => set('coverImageUrl', v)}
                businessId={business?.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" /> Brand Color
              </CardTitle>
              <CardDescription>Used for buttons, links, and accent elements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.brand?.primaryColor || BRAND_PRIMARY}
                  onChange={(e) => setBrand('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  placeholder={BRAND_PRIMARY}
                  value={settings.brand?.primaryColor || ''}
                  onChange={(e) => setBrand('primaryColor', e.target.value)}
                  className="w-32"
                />
                <span className="text-xs text-gray-400">Hex color code</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> Social Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['facebook', 'instagram', 'twitter', 'youtube'].map(platform => (
                  <div key={platform} className="space-y-1.5">
                    <Label className="capitalize text-xs">{platform}</Label>
                    <Input
                      placeholder={`https://${platform}.com/yourhandle`}
                      value={settings.socialLinks?.[platform] || ''}
                      onChange={(e) => setSocialLink(platform, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Content Tab ─────────────────────────────────────────────── */}
        <TabsContent value="content" className="space-y-4 mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Store Information</CardTitle>
              <CardDescription>Details shown to customers on your public store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Store Description</Label>
                <Textarea
                  placeholder="Describe your store and what you sell..."
                  value={settings.description || ''}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-400">Shown on your store page and used for SEO meta description.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Public Contact</CardTitle>
              <CardDescription>
                Phone, email, and location shown in your store header, footer, and contact page.
                {settings.ownerLoginEmail ? (
                  <span className="mt-1 block text-amber-700">
                    Login email ({settings.ownerLoginEmail}) is not shown publicly.
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Public support email</Label>
                  <Input
                    type="email"
                    placeholder="support@yourbusiness.com"
                    value={settings.publicEmail || ''}
                    onChange={(e) => set('publicEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer phone</Label>
                  <Input
                    placeholder={phonePlaceholder}
                    value={settings.phone || ''}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp (optional)</Label>
                  <Input
                    placeholder={phonePlaceholder}
                    value={settings.whatsapp || ''}
                    onChange={(e) => set('whatsapp', e.target.value)}
                  />
                  <p className="text-xs text-gray-400">Leave blank to use the customer phone number.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Website (optional)</Label>
                  <Input
                    placeholder="https://yourbusiness.com"
                    value={settings.website || ''}
                    onChange={(e) => set('website', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Street address</Label>
                <Input
                  placeholder="Building, street, area"
                  value={settings.address || ''}
                  onChange={(e) => set('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={settings.city || ''}
                    onChange={(e) => set('city', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    placeholder="Country"
                    value={settings.country || ''}
                    onChange={(e) => set('country', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal code</Label>
                  <Input
                    placeholder="Postal / ZIP"
                    value={settings.postalCode || ''}
                    onChange={(e) => set('postalCode', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Business hours</Label>
                <Textarea
                  placeholder={'Mon-Sat: 9:00 AM - 6:00 PM\nSun: Closed'}
                  value={settings.businessHours || ''}
                  onChange={(e) => set('businessHours', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-400">Shown on your contact page and store footer when provided.</p>
              </div>
            </CardContent>
          </Card>

          {showMeetingUrlField ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">Meeting / scheduling link</CardTitle>
                <CardDescription>
                  Add your Calendly or scheduling page for test drives, appointments, and consultations.
                  Customers open it in a new tab; your contact form stays available as a fallback.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="store-meeting-url">Scheduling URL</Label>
                <Input
                  id="store-meeting-url"
                  type="url"
                  placeholder="https://calendly.com/your-business/30min"
                  value={settings.booking?.meetingUrl || ''}
                  onChange={(e) => setBooking('meetingUrl', e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  Shown on your storefront when visitors book test drives, showroom visits, or similar services.
                  Requires Business plan or higher (Appointment Booking).
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Hero & Announcement</CardTitle>
              <CardDescription>Main homepage headline (cover image is under Branding)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Hero headline</Label>
                <Input
                  placeholder="e.g. Shop the best products"
                  value={settings.heroTitle || ''}
                  onChange={(e) => set('heroTitle', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hero subtext</Label>
                <Textarea
                  placeholder="Short line under the headline on your store homepage"
                  value={settings.heroSubtitle || ''}
                  onChange={(e) => set('heroSubtitle', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Top announcement strip</Label>
                <Input
                  placeholder="e.g. Free shipping on orders over Rs. 2,000"
                  value={settings.announcement || ''}
                  onChange={(e) => set('announcement', e.target.value)}
                />
                <p className="text-xs text-gray-400">Thin bar at the very top on mobile.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <select
                    className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white"
                    value={settings.currency}
                    onChange={(e) => set('currency', e.target.value)}
                  >
                    <option value="PKR">PKR (Rs.)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Theme</Label>
                  <select
                    className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white"
                    value={settings.theme}
                    onChange={(e) => set('theme', e.target.value)}
                  >
                    <option value="default">Default</option>
                    <option value="modern">Modern</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Marketing Tab ─────────────────────────────────────────── */}
        <TabsContent value="marketing" className="space-y-4 mt-5">
          {marketplaceStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Marketplace portal
                </CardTitle>
                <CardDescription>
                  Hero promo strip and marketplace ticker text on your Tenvo Auto Marketplace homepage (static copy, no live government feeds).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hero promo</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Eyebrow</Label>
                      <Input
                        value={settings.marketplace?.heroPromo?.eyebrow || ''}
                        onChange={(e) => setMarketplace('heroPromo', 'eyebrow', e.target.value)}
                        placeholder="Tenvo Auto Marketplace"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CTA label</Label>
                      <Input
                        value={settings.marketplace?.heroPromo?.ctaLabel || ''}
                        onChange={(e) => setMarketplace('heroPromo', 'ctaLabel', e.target.value)}
                        placeholder="Explore deals"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Headline</Label>
                    <Input
                      value={settings.marketplace?.heroPromo?.title || ''}
                      onChange={(e) => setMarketplace('heroPromo', 'title', e.target.value)}
                      placeholder="Drive home your next car with exclusive deals"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subtext</Label>
                    <Textarea
                      rows={2}
                      value={settings.marketplace?.heroPromo?.subtitle || ''}
                      onChange={(e) => setMarketplace('heroPromo', 'subtitle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Promo image URL</Label>
                    <Input
                      value={settings.marketplace?.heroPromo?.image || ''}
                      onChange={(e) => setMarketplace('heroPromo', 'image', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">COE ticker</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Label</Label>
                      <Input
                        value={settings.marketplace?.coeTicker?.label || ''}
                        onChange={(e) => setMarketplace('coeTicker', 'label', e.target.value)}
                        placeholder="Cat A COE"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Value</Label>
                      <Input
                        value={settings.marketplace?.coeTicker?.value || ''}
                        onChange={(e) => setMarketplace('coeTicker', 'value', e.target.value)}
                        placeholder="$128,000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Change text</Label>
                      <Input
                        value={settings.marketplace?.coeTicker?.change || ''}
                        onChange={(e) => setMarketplace('coeTicker', 'change', e.target.value)}
                        placeholder="▼ $2,001"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 pt-1">
                  {[
                    ['showEShop', 'Show e-shop section', false],
                    ['showForum', 'Show forum section', false],
                    ['showArticles', 'Show articles section', false],
                    ['showMarketingBanners', 'Show marketing banners', false],
                    ['showTrustStrip', 'Show trust strip', false],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={settings.marketplace?.[key] !== false}
                        onCheckedChange={(v) => setMarketplaceFlag(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {dealershipStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Tenvo Vehicles showroom
                </CardTitle>
                <CardDescription>
                  Customize trust strip, tagline, UAN, and hero video for your vehicle dealership storefront.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Tagline</Label>
                    <Input
                      value={settings.dealership?.tagline || ''}
                      onChange={(e) => setDealership('tagline', e.target.value)}
                      placeholder="Your trusted automotive partner"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UAN / hotline</Label>
                    <Input
                      value={settings.dealership?.uan || ''}
                      onChange={(e) => setDealership('uan', e.target.value)}
                      placeholder="111 734 425"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Welcome headline</Label>
                  <Input
                    value={settings.dealership?.welcomeTitle || ''}
                    onChange={(e) => setDealership('welcomeTitle', e.target.value)}
                    placeholder="Welcome to your ultimate car destination"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Showroom video URL (YouTube embed)</Label>
                  <Input
                    value={settings.dealership?.videoUrl || ''}
                    onChange={(e) => setDealership('videoUrl', e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Trust strip hours</Label>
                    <Input
                      value={settings.dealership?.trustStrip?.hours || ''}
                      onChange={(e) => setDealershipTrust('hours', e.target.value)}
                      placeholder="10 am - 07 pm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shipping label</Label>
                    <Input
                      value={settings.dealership?.trustStrip?.shippingLabel || ''}
                      onChange={(e) => setDealershipTrust('shippingLabel', e.target.value)}
                      placeholder="Nationwide shipping"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rating label</Label>
                    <Input
                      value={settings.dealership?.trustStrip?.ratingLabel || ''}
                      onChange={(e) => setDealershipTrust('ratingLabel', e.target.value)}
                      placeholder="4.5+ Google ratings"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.dealership?.showTrustStrip !== false}
                      onCheckedChange={(v) => setDealership('showTrustStrip', v)}
                    />
                    <Label className="text-sm">Show trust strip</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.dealership?.showMarketingBanners !== false}
                      onCheckedChange={(v) => setDealership('showMarketingBanners', v)}
                    />
                    <Label className="text-sm">Show marketing banners</Label>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Logo and cover image are set under Branding. Hero slide images use your cover image on slide one, with template defaults for the rest until you add custom marketing sections.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {autoPartsStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Auto parts storefront
                </CardTitle>
                <CardDescription>
                  Toggle homepage sections below the parts finder hero: promo cards, categories, deals, and trust strip.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showPromoCards', 'Promo card carousel'],
                    ['showFeaturedCategories', 'Featured categories grid'],
                    ['showFeaturedDeals', 'Featured deals'],
                    ['showVehicleBrands', 'Shop by car brand'],
                    ['showTrending', 'Top trending products'],
                    ['showTrustSection', 'Why choose us strip'],
                    ['showCategoryRails', 'Category product rails'],
                    ['showMarketingBanners', 'Custom marketing banners'],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={settings.autoParts?.[key] !== false}
                        onCheckedChange={(v) => setAutoParts(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Trust section title</Label>
                    <Input
                      value={settings.autoParts?.trustTitle || ''}
                      onChange={(e) => setAutoParts('trustTitle', e.target.value)}
                      placeholder="Why choose us"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Trust subtitle</Label>
                    <Input
                      value={settings.autoParts?.trustSubtitle || ''}
                      onChange={(e) => setAutoParts('trustSubtitle', e.target.value)}
                      placeholder="Your trusted auto parts partner"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bottom CTA title</Label>
                  <Input
                    value={settings.autoParts?.ctaTitle || ''}
                    onChange={(e) => setAutoParts('ctaTitle', e.target.value)}
                    placeholder="Need help finding the right part?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bottom CTA subtitle</Label>
                  <Textarea
                    rows={2}
                    value={settings.autoParts?.ctaSubtitle || ''}
                    onChange={(e) => setAutoParts('ctaSubtitle', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bottom CTA button label</Label>
                  <Input
                    value={settings.autoParts?.ctaLabel || ''}
                    onChange={(e) => setAutoParts('ctaLabel', e.target.value)}
                    placeholder="Browse all parts"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Hero slides use your cover image on slide one, with template defaults for the rest. Product metadata (part number, OEM, fitment) is edited per SKU in inventory.
                </p>
              </CardContent>
            </Card>
          ) : null}


          {pharmacyStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Pharmacy storefront
                </CardTitle>
                <CardDescription>
                  Toggle homepage sections below the pharmacy hero. Categories and products come from live inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showRefillPromo', 'Refill reminder CTA', false],
                    ['showBrandsRow', 'Trusted brands row', false],
                    ['showSeoBlock', 'SEO content block', true],
                  ].map(([key, label, optIn]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={optIn ? settings.pharmacy?.[key] === true : settings.pharmacy?.[key] !== false}
                        onCheckedChange={(v) => setPharmacy(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Search placeholder</Label>
                    <Input
                      value={settings.pharmacy?.searchPlaceholder || ''}
                      onChange={(e) => setPharmacy('searchPlaceholder', e.target.value)}
                      placeholder="Search medicines, vitamins, brands…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Featured rail title</Label>
                    <Input
                      value={settings.pharmacy?.featuredRailTitle || ''}
                      onChange={(e) => setPharmacy('featuredRailTitle', e.target.value)}
                      placeholder="Top selling"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {furnitureStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Furniture storefront
                </CardTitle>
                <CardDescription>
                  Toggle homepage sections below the furniture hero. Room tiles and rails use your catalog categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showRoomTiles', 'Room collection tiles', false],
                    ['showTestimonials', 'Customer testimonials', true],
                    ['showShowroomCta', 'Showroom CTA in hero', false],
                  ].map(([key, label, optIn]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={optIn ? settings.furniture?.[key] === true : settings.furniture?.[key] !== false}
                        onCheckedChange={(v) => setFurniture(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Search placeholder</Label>
                    <Input
                      value={settings.furniture?.searchPlaceholder || ''}
                      onChange={(e) => setFurniture('searchPlaceholder', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Showroom link label</Label>
                    <Input
                      value={settings.furniture?.showroomLabel || ''}
                      onChange={(e) => setFurniture('showroomLabel', e.target.value)}
                      placeholder="Visit showroom"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {fitnessStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Gym & fitness storefront
                </CardTitle>
                <CardDescription>
                  Toggle homepage sections and hero copy. Products, memberships, and supplements come from live inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showPrograms', 'Training programs row', false],
                    ['showMemberships', 'Membership packages', false],
                    ['showBenefits', 'Extra benefits', false],
                    ['showTrainers', 'Meet the coaches', true],
                    ['showBookingStrip', 'Book your slot strip', false],
                    ['showPromoBanners', 'Promo banner row', false],
                    ['showTrustPillars', 'Trust pillars strip', true],
                  ].map(([key, label, optIn]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={optIn ? settings.fitness?.[key] === true : settings.fitness?.[key] !== false}
                        onCheckedChange={(v) => setFitness(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Hero title</Label>
                    <Input
                      value={settings.fitness?.heroTitle || ''}
                      onChange={(e) => setFitness('heroTitle', e.target.value)}
                      placeholder="Be fierce. Train wild."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Search placeholder</Label>
                    <Input
                      value={settings.fitness?.searchPlaceholder || ''}
                      onChange={(e) => setFitness('searchPlaceholder', e.target.value)}
                      placeholder="Search supplements, gear, memberships…"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Hero subtitle</Label>
                    <Input
                      value={settings.fitness?.heroSubtitle || ''}
                      onChange={(e) => setFitness('heroSubtitle', e.target.value)}
                      placeholder="Strength, mobility, and conditioning…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Supplements rail title</Label>
                    <Input
                      value={settings.fitness?.supplementRailTitle || ''}
                      onChange={(e) => setFitness('supplementRailTitle', e.target.value)}
                      placeholder="Fuel your training"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Featured rail title</Label>
                    <Input
                      value={settings.fitness?.featuredRailTitle || ''}
                      onChange={(e) => setFitness('featuredRailTitle', e.target.value)}
                      placeholder="Top picks"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Featured rail subtitle</Label>
                    <Input
                      value={settings.fitness?.featuredRailSubtitle || ''}
                      onChange={(e) => setFitness('featuredRailSubtitle', e.target.value)}
                      placeholder="Bestsellers from your gym"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Membership section title</Label>
                    <Input
                      value={settings.fitness?.membershipSectionTitle || ''}
                      onChange={(e) => setFitness('membershipSectionTitle', e.target.value)}
                      placeholder="Gents gym & ladies section plans"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Membership section subtitle</Label>
                    <Input
                      value={settings.fitness?.membershipSectionSubtitle || ''}
                      onChange={(e) => setFitness('membershipSectionSubtitle', e.target.value)}
                      placeholder="Monthly through annual passes from your catalog"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Membership SKUs, PT sessions, and supplement grids read from inventory categories (Memberships, Personal Training, Classes, supplements). Category tile photos use your category image, a product photo from that category, or gym archive art until you upload images in inventory. Enable Meet the coaches only after adding trainer profiles in settings. Use booking meeting URL above for Calendly-style scheduling.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {fashionStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Clothing & textile storefront
                </CardTitle>
                <CardDescription>
                  Control the editorial homepage look and feel. Sections are built from your live
                  categories and inventory; toggle what shows and rename each row.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <Switch
                    checked={settings.fashion?.animations !== false}
                    onCheckedChange={(v) => setFashion('animations', v)}
                  />
                  <div>
                    <Label className="text-sm">Scroll & motion effects</Label>
                    <p className="text-xs text-gray-400">
                      Lightweight fade-in, staggered tiles, and gentle auto-scrolling category
                      rows. Automatically disabled for visitors who prefer reduced motion.
                    </p>
                  </div>
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Homepage sections
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showHeroRating', 'Hero rating / social proof'],
                    ['showTopCollections', 'Top collections carousel'],
                    ['showTopPicks', 'Top picks product row'],
                    ['showEditorialSpotlight', 'Editorial spotlight banner'],
                    ['showUnstitched', 'Unstitched category grid'],
                    ['showReadyToWear', 'Ready to wear row'],
                    ['showAccessories', 'Accessories row'],
                    ['showOffers', 'Offers / sale rail'],
                    ['showNewArrivals', 'New arrivals rail'],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={settings.fashion?.[key] !== false}
                        onCheckedChange={(v) => setFashion(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Section titles (optional)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Unstitched title</Label>
                    <Input
                      value={settings.fashion?.unstitchedTitle || ''}
                      onChange={(e) => setFashion('unstitchedTitle', e.target.value)}
                      placeholder="UNSTITCHED"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ready to wear title</Label>
                    <Input
                      value={settings.fashion?.readyToWearTitle || ''}
                      onChange={(e) => setFashion('readyToWearTitle', e.target.value)}
                      placeholder="READY TO WEAR"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Accessories title</Label>
                    <Input
                      value={settings.fashion?.accessoriesTitle || ''}
                      onChange={(e) => setFashion('accessoriesTitle', e.target.value)}
                      placeholder="ACCESSORIES"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Offers title</Label>
                    <Input
                      value={settings.fashion?.offersTitle || ''}
                      onChange={(e) => setFashion('offersTitle', e.target.value)}
                      placeholder="OFFERS & SALE"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New arrivals title</Label>
                    <Input
                      value={settings.fashion?.newArrivalsTitle || ''}
                      onChange={(e) => setFashion('newArrivalsTitle', e.target.value)}
                      placeholder="NEW ARRIVALS"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Hero slides and department imagery adapt to your store type (boutique, textile,
                  leather, jewellery) and use your category and product photos. Set your accent color
                  under Branding and the top announcement strip under Content.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {restaurantStore ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Restaurant storefront
                </CardTitle>
                <CardDescription>
                  Toggle homepage sections below the food hero. Categories and menu items come from your live inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['showCuisineCarousel', 'Category carousel', false],
                    ['showSuperPicks', 'Featured picks rail', false],
                    ['showOrderModes', 'Delivery / pickup / dine-in tiles', false],
                    ['showRewardsCta', 'Rewards signup CTA', true],
                    ['showDeliveryInfo', 'Hours & delivery info strip', false],
                  ].map(([key, label, optIn]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={optIn ? settings.restaurant?.[key] === true : settings.restaurant?.[key] !== false}
                        onCheckedChange={(v) => setRestaurant(key, v)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Location label</Label>
                    <Input
                      value={settings.restaurant?.locationLabel || ''}
                      onChange={(e) => setRestaurant('locationLabel', e.target.value)}
                      placeholder="Deliver to"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default location hint</Label>
                    <Input
                      value={settings.restaurant?.defaultLocation || ''}
                      onChange={(e) => setRestaurant('defaultLocation', e.target.value)}
                      placeholder="Uses store city when empty"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Search placeholder</Label>
                    <Input
                      value={settings.restaurant?.searchPlaceholder || ''}
                      onChange={(e) => setRestaurant('searchPlaceholder', e.target.value)}
                      placeholder="Search dishes, categories, or specials…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Catering link label</Label>
                    <Input
                      value={settings.restaurant?.cateringLabel || ''}
                      onChange={(e) => setRestaurant('cateringLabel', e.target.value)}
                      placeholder="Catering"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Featured rail title</Label>
                    <Input
                      value={settings.restaurant?.featuredRailTitle || ''}
                      onChange={(e) => setRestaurant('featuredRailTitle', e.target.value)}
                      placeholder="Featured picks"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Featured rail subtitle</Label>
                    <Input
                      value={settings.restaurant?.featuredRailSubtitle || ''}
                      onChange={(e) => setRestaurant('featuredRailSubtitle', e.target.value)}
                      placeholder="Popular dishes from your menu"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Hero slides use your cover image and featured menu items. Cuisine icons and promo banners are built from your product categories and catalog unless you add custom arrays in advanced settings.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Homepage marketing sections
              </CardTitle>
              <CardDescription>
                Add promotional banners between your hero and product rows. Upload a photo or design with your brand colors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingSectionsEditor
                sections={settings.pageSections || []}
                brandColor={settings.brand?.primaryColor}
                onChange={(pageSections) => set('pageSections', pageSections)}
                businessId={business?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Domain Tab ──────────────────────────────────────────────── */}
        <TabsContent value="domain" className="space-y-4 mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Store URL
              </CardTitle>
              <CardDescription>The public address where customers access your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fullStoreUrl && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-emerald-800 break-all">{fullStoreUrl}</span>
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>
                </div>
              )}
              <Separator />
              <div className="space-y-1.5">
                <Label>Store Slug</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-md text-sm text-gray-500 shrink-0">
                    /store/
                  </div>
                  <Input
                    placeholder="your-store-name"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="rounded-l-none"
                  />
                  <Button onClick={handleSaveDomain} disabled={domainSaving || !newDomain.trim()} size="sm">
                    {domainSaving ? 'Saving...' : 'Apply'}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Only lowercase letters, numbers, and hyphens. This is your store&apos;s public URL path.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" /> Product Sync
              </CardTitle>
              <CardDescription>Sync your inventory products to the public store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">{settings.products?.active ?? 0}</span> active &nbsp;/&nbsp;
                    <span className="font-semibold text-gray-800">{settings.products?.total ?? 0}</span> total products
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Marks all active inventory products as visible on the store</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSyncInventory} disabled={syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments Tab ────────────────────────────────────────────── */}
        <TabsContent value="payments" className="space-y-4 mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Payment Methods
              </CardTitle>
              <CardDescription>Choose which payment options customers see at checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cash on Delivery</p>
                    <p className="text-xs text-gray-400">Customer pays on delivery</p>
                  </div>
                </div>
                <Switch checked={settings.enableCOD} onCheckedChange={(v) => set('enableCOD', v)} />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Card Payments</p>
                    <p className="text-xs text-gray-400">Credit/debit via Stripe</p>
                  </div>
                </div>
                <Switch checked={settings.enableCard} onCheckedChange={(v) => set('enableCard', v)} />
              </div>
              <Separator />
              <button
                onClick={() => router.push(`/business/${category}/store-settings/payments`)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
              >
                <span className="font-medium">Advanced Payment Settings (Stripe Connect, COD fees…)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shipping Tab ────────────────────────────────────────────── */}
        <TabsContent value="shipping" className="space-y-4 mt-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4" /> Shipping Rules
              </CardTitle>
              <CardDescription>Configure shipping thresholds and return policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Free Shipping Threshold</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 shrink-0">{settings.currency}</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="2000"
                    value={settings.freeShippingThreshold}
                    onChange={(e) => set('freeShippingThreshold', parseInt(e.target.value) || 0)}
                    className="w-40"
                  />
                </div>
                <p className="text-xs text-gray-400">Orders above this amount qualify for free shipping.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Return Window (Days)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="7"
                    value={settings.returnPolicyDays}
                    onChange={(e) => set('returnPolicyDays', parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
                <p className="text-xs text-gray-400">How many days customers have to return items.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
