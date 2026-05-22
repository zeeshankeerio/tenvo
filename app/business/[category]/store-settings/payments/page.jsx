'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  CreditCard, 
  Wallet, 
  Truck, 
  Building2, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  ToggleLeft,
  ToggleRight,
  Save,
  Loader2
} from 'lucide-react';
import { 
  getStorePaymentSettings, 
  createStripeConnectAccount,
  getStripeOnboardingUrl,
  addCODPaymentMethod,
  addLocalPaymentMethod,
  togglePaymentMethod,
  updatePaymentSettings
} from '@/lib/actions/storefront/payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const paymentIcons = {
  stripe: CreditCard,
  cod: Truck,
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Building2,
  paypal: Wallet,
};

export default function PaymentSettingsPage() {
  const { category } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [stripeConnect, setStripeConnect] = useState(null);
  const [activeTab, setActiveTab] = useState('methods');

  // Form states
  const [codSettings, setCodSettings] = useState({
    enabled: true,
    displayName: 'Cash on Delivery (COD)',
    description: 'Pay when you receive your order',
    instructions: 'Please keep exact change ready',
    feePercentage: 0,
    feeFixed: 0,
  });

  const [generalSettings, setGeneralSettings] = useState({
    autoCapturePayments: true,
    requireBillingAddress: true,
    allowSaveCards: false,
    defaultCurrency: 'PKR',
    allowCod: true,
    allowPrepaid: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const result = await getStorePaymentSettings();
      
      if (result.success) {
        setSettings(result.data.settings);
        setPaymentMethods(result.data.paymentMethods || []);
        setStripeConnect(result.data.stripeConnect);
        
        if (result.data.settings) {
          setGeneralSettings({
            autoCapturePayments: result.data.settings.auto_capture_payments ?? true,
            requireBillingAddress: result.data.settings.require_billing_address ?? true,
            allowSaveCards: result.data.settings.allow_save_cards ?? false,
            defaultCurrency: result.data.settings.default_currency || 'PKR',
            allowCod: result.data.settings.allow_cod ?? true,
            allowPrepaid: result.data.settings.allow_prepaid ?? true,
          });
        }
      }
    } catch (error) {
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectStripe() {
    try {
      setSaving(true);
      const result = await createStripeConnectAccount({
        businessName: 'Your Store', // Get from business context
        email: 'store@example.com',
        country: 'PK',
      });

      if (result.success) {
        toast.success('Stripe account created!');
        if (result.data.onboardingUrl) {
          window.open(result.data.onboardingUrl, '_blank');
        }
        await loadSettings();
      } else {
        toast.error(result.error?.message || 'Failed to create Stripe account');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleStripeOnboarding() {
    try {
      setSaving(true);
      const result = await getStripeOnboardingUrl();
      
      if (result.success && result.data.onboardingUrl) {
        window.open(result.data.onboardingUrl, '_blank');
      } else {
        toast.error('Failed to get onboarding URL');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleEnableCOD() {
    try {
      setSaving(true);
      const result = await addCODPaymentMethod({
        displayName: codSettings.displayName,
        description: codSettings.description,
        instructions: codSettings.instructions,
        feePercentage: codSettings.feePercentage,
        feeFixed: codSettings.feeFixed,
      });

      if (result.success) {
        toast.success('COD payment method enabled!');
        await loadSettings();
      } else {
        toast.error(result.error?.message || 'Failed to enable COD');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleMethod(methodId, isActive) {
    try {
      const result = await togglePaymentMethod(methodId, !isActive);
      
      if (result.success) {
        toast.success(`Payment method ${!isActive ? 'enabled' : 'disabled'}`);
        await loadSettings();
      } else {
        toast.error('Failed to update payment method');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true);
      const result = await updatePaymentSettings({
        auto_capture_payments: generalSettings.autoCapturePayments,
        require_billing_address: generalSettings.requireBillingAddress,
        allow_save_cards: generalSettings.allowSaveCards,
        default_currency: generalSettings.defaultCurrency,
        allow_cod: generalSettings.allowCod,
        allow_prepaid: generalSettings.allowPrepaid,
      });

      if (result.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(result.error?.message || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasStripe = paymentMethods.some(m => m.provider === 'stripe');
  const hasCOD = paymentMethods.some(m => m.provider === 'cod');
  const isStripeOnboarded = stripeConnect?.onboarding_complete;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure how customers pay for their orders
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">General Settings</TabsTrigger>
          <TabsTrigger value="stripe">Stripe Connect</TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          {/* Stripe Card Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit/Debit Cards (Stripe)
              </CardTitle>
              <CardDescription>
                Accept Visa, Mastercard, and other major cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasStripe ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          Stripe {isStripeOnboarded ? 'Connected & Active' : 'Connected (Setup Pending)'}
                        </p>
                        <p className="text-sm text-green-600">
                          {stripeConnect?.stripe_account_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isStripeOnboarded && (
                        <Button
                          onClick={handleStripeOnboarding}
                          disabled={saving}
                          variant="outline"
                        >
                          Complete Setup
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      <Switch
                        checked={paymentMethods.find(m => m.provider === 'stripe')?.is_active}
                        onCheckedChange={() => handleToggleMethod(
                          paymentMethods.find(m => m.provider === 'stripe')?.id,
                          paymentMethods.find(m => m.provider === 'stripe')?.is_active
                        )}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Connect Stripe to accept credit/debit card payments
                  </p>
                  <Button 
                    onClick={handleConnectStripe}
                    disabled={saving}
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Connect Stripe</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cash on Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Cash on Delivery (COD)
              </CardTitle>
              <CardDescription>
                Let customers pay when they receive their order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasCOD ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">COD Enabled</p>
                      <p className="text-sm text-blue-600">
                        Customers can pay on delivery
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentMethods.find(m => m.provider === 'cod')?.is_active}
                    onCheckedChange={() => handleToggleMethod(
                      paymentMethods.find(m => m.provider === 'cod')?.id,
                      paymentMethods.find(m => m.provider === 'cod')?.is_active
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Display Name</Label>
                      <Input
                        value={codSettings.displayName}
                        onChange={(e) => setCodSettings({...codSettings, displayName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={codSettings.description}
                        onChange={(e) => setCodSettings({...codSettings, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Instructions for Customer</Label>
                    <Input
                      value={codSettings.instructions}
                      onChange={(e) => setCodSettings({...codSettings, instructions: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={handleEnableCOD}
                    disabled={saving}
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enabling...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Enable COD</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Local Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Local Payment Methods
              </CardTitle>
              <CardDescription>
                EasyPaisa, JazzCash, and Bank Transfer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <Smartphone className="h-8 w-8 text-green-600" />
                  <span className="font-medium">EasyPaisa</span>
                  <Badge variant="secondary">Coming Soon</Badge>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <Smartphone className="h-8 w-8 text-red-600" />
                  <span className="font-medium">JazzCash</span>
                  <Badge variant="secondary">Coming Soon</Badge>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <span className="font-medium">Bank Transfer</span>
                  <Badge variant="secondary">Coming Soon</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Payment Settings</CardTitle>
              <CardDescription>
                Configure how payments work in your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Auto-capture Payments</Label>
                  <p className="text-sm text-gray-500">
                    Automatically charge customers when they place an order
                  </p>
                </div>
                <Switch
                  checked={generalSettings.autoCapturePayments}
                  onCheckedChange={(checked) => 
                    setGeneralSettings({...generalSettings, autoCapturePayments: checked})
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require Billing Address</Label>
                  <p className="text-sm text-gray-500">
                    Ask customers for billing address during checkout
                  </p>
                </div>
                <Switch
                  checked={generalSettings.requireBillingAddress}
                  onCheckedChange={(checked) => 
                    setGeneralSettings({...generalSettings, requireBillingAddress: checked})
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Allow Save Cards</Label>
                  <p className="text-sm text-gray-500">
                    Let customers save their cards for faster checkout
                  </p>
                </div>
                <Switch
                  checked={generalSettings.allowSaveCards}
                  onCheckedChange={(checked) => 
                    setGeneralSettings({...generalSettings, allowSaveCards: checked})
                  }
                />
              </div>

              <Separator />

              <div>
                <Label className="text-base">Default Currency</Label>
                <select
                  value={generalSettings.defaultCurrency}
                  onChange={(e) => setGeneralSettings({...generalSettings, defaultCurrency: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Settings</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Connect Tab */}
        <TabsContent value="stripe" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription>
                Manage your Stripe Connect account and view payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stripeConnect ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Account ID</p>
                      <p className="font-mono text-sm">{stripeConnect.stripe_account_id}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Account Type</p>
                      <p className="font-medium capitalize">{stripeConnect.account_type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${stripeConnect.is_charges_enabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className="text-sm text-gray-500 mb-1">Charges</p>
                      <div className="flex items-center gap-2">
                        {stripeConnect.is_charges_enabled ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /> <span className="text-green-700">Enabled</span></>
                        ) : (
                          <><AlertCircle className="h-4 w-4 text-yellow-600" /> <span className="text-yellow-700">Pending</span></>
                        )}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${stripeConnect.is_payouts_enabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className="text-sm text-gray-500 mb-1">Payouts</p>
                      <div className="flex items-center gap-2">
                        {stripeConnect.is_payouts_enabled ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /> <span className="text-green-700">Enabled</span></>
                        ) : (
                          <><AlertCircle className="h-4 w-4 text-yellow-600" /> <span className="text-yellow-700">Pending</span></>
                        )}
                      </div>
                    </div>
                  </div>

                  {!stripeConnect.onboarding_complete && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 mb-2">
                        Complete your Stripe onboarding to start accepting payments
                      </p>
                      <Button
                        onClick={handleStripeOnboarding}
                        disabled={saving}
                      >
                        Continue Onboarding
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Connect with Stripe
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Stripe is the easiest way to accept payments online. 
                    Get started in minutes with Stripe Connect.
                  </p>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={saving}
                    size="lg"
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Connect with Stripe</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
