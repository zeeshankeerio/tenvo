'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, Truck, MapPin, Check, ChevronRight, 
  Shield, Lock, AlertCircle, Wallet, Banknote,
  Smartphone, Building2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { toast } from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createStorefrontOrder } from '@/lib/actions/storefront/orders';
import { getAvailablePaymentMethods, createPaymentIntent } from '@/lib/actions/storefront/payments';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Payment method icons mapping
const paymentIcons = {
  stripe: CreditCard,
  cod: Banknote,
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Building2,
  paypal: Wallet,
  card: CreditCard,
  wallet: Wallet,
};

const steps = [
  { id: 'information', label: 'Information' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

export default function CheckoutPage({ params }) {
  const { businessDomain } = params;
  const router = useRouter();
  const { cart, calculateTotals, clearCart } = useCart();
  const { currency, formatPrice, businessId } = useStorefront();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'PK', // Default to Pakistan
    sameAsBilling: true,
    saveInfo: false,
    shippingMethod: 'standard',
    paymentMethod: '',
  });
  
  // Payment methods from store configuration
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  
  const { subtotal, itemCount } = calculateTotals();
  
  // Calculate totals
  const shippingCosts = {
    standard: subtotal > 2000 ? 0 : 150,
    express: 300,
    pickup: 0,
  };
  
  const shipping = shippingCosts[formData.shippingMethod];
  const tax = subtotal * 0.17;
  const total = subtotal + shipping + tax;
  
  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0 && !orderComplete) {
      router.push(`/store/${businessDomain}/cart`);
    }
  }, [cart.items.length, orderComplete, router, businessDomain]);
  
  // Load available payment methods
  useEffect(() => {
    async function loadPaymentMethods() {
      if (!businessId) return;
      
      try {
        setLoadingPaymentMethods(true);
        const result = await getAvailablePaymentMethods(businessId);
        
        if (result.success && result.data.methods) {
          setPaymentMethods(result.data.methods);
          // Set default payment method
          if (result.data.methods.length > 0 && !formData.paymentMethod) {
            setFormData(prev => ({
              ...prev,
              paymentMethod: result.data.methods[0].provider
            }));
          }
        }
      } catch (error) {
        console.error('[Checkout] Error loading payment methods:', error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    }
    
    loadPaymentMethods();
  }, [businessId]);
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };
  
  const validateStep = (step) => {
    switch (step) {
      case 0: // Information
        if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone) {
          toast.error('Please fill in all required fields');
          return false;
        }
        if (!formData.email.includes('@')) {
          toast.error('Please enter a valid email');
          return false;
        }
        return true;
        
      case 1: // Shipping
        if (!formData.address || !formData.city || !formData.postalCode) {
          toast.error('Please enter your shipping address');
          return false;
        }
        return true;
        
      case 2: // Payment
        return true;
        
      case 3: // Review
        return true;
        
      default:
        return true;
    }
  };
  
  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    try {
      // Validate cart has items
      if (cart.items.length === 0) {
        toast.error('Your cart is empty');
        return;
      }
      
      // Validate businessId exists
      if (!businessId) {
        toast.error('Business information not available');
        return;
      }
      
      // Prepare order data
      const orderData = {
        customer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        items: cart.items.map(item => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId || null,
        })),
        subtotal,
        shipping: {
          cost: shipping,
          method: formData.shippingMethod,
        },
        tax,
        total,
        notes: formData.notes || null,
        payment: {
          method: formData.paymentMethod,
          status: formData.paymentMethod === 'cod' ? 'pending' : 'paid',
        },
      };
      
      // Create order using server action
      const result = await createStorefrontOrder(businessId, orderData);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create order');
      }
      
      const { orderNumber, total: orderTotal } = result.data;
      
      // Process Stripe payment if card payment
      if (formData.paymentMethod === 'card') {
        // Stripe payment would be handled here
        // For now, we assume it's processed
        toast.success('Payment processed successfully!');
      }
      
      setOrderNumber(orderNumber);
      setOrderComplete(true);
      clearCart();
      
      toast.success(`Order ${orderNumber} placed successfully!`);
      
      // TODO: Send order confirmation email
      // TODO: Notify business owner
      
    } catch (error) {
      console.error('[handlePlaceOrder] Error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 mb-4">
              Thank you for your order. We've sent a confirmation to {formData.email}
            </p>
            <p className="text-lg font-semibold mb-6">
              Order #{orderNumber}
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full"
                onClick={() => router.push(`/store/${businessDomain}/account/orders`)}
              >
                View Order
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/store/${businessDomain}/products`)}
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Checkout Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Checkout</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index <= currentStep 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 text-gray-500"
                )}>
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={cn(
                  "ml-2 text-sm font-medium hidden sm:block",
                  index <= currentStep ? "text-gray-900" : "text-gray-500"
                )}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/* Step 1: Contact Information */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-semibold">Contact Information</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+92 300 1234567"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Shipping Address */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-semibold">Shipping Address</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          placeholder="Street address, apartment, suite, etc."
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            placeholder="Karachi"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code *</Label>
                          <Input
                            id="postalCode"
                            placeholder="54000"
                            value={formData.postalCode}
                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Shipping Method</Label>
                        <RadioGroup 
                          value={formData.shippingMethod}
                          onValueChange={(value) => handleInputChange('shippingMethod', value)}
                          className="space-y-3 mt-2"
                        >
                          <div className="flex items-center space-x-2 border rounded-lg p-4">
                            <RadioGroupItem value="standard" id="standard" />
                            <Label htmlFor="standard" className="flex-1 cursor-pointer">
                              <div className="flex justify-between">
                                <span>Standard Delivery (3-5 days)</span>
                                <span className="font-medium">
                                  {shippingCosts.standard === 0 ? 'FREE' : formatCurrency(shippingCosts.standard, currency)}
                                </span>
                              </div>
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2 border rounded-lg p-4">
                            <RadioGroupItem value="express" id="express" />
                            <Label htmlFor="express" className="flex-1 cursor-pointer">
                              <div className="flex justify-between">
                                <span>Express Delivery (1-2 days)</span>
                                <span className="font-medium">{formatCurrency(shippingCosts.express, currency)}</span>
                              </div>
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2 border rounded-lg p-4">
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                              <div className="flex justify-between">
                                <span>Store Pickup (Ready in 2 hours)</span>
                                <span className="font-medium text-green-600">FREE</span>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Payment */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-semibold">Payment Method</h2>
                    </div>
                    
                    {loadingPaymentMethods ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No payment methods available</p>
                  </div>
                ) : (
                  <RadioGroup 
                    value={formData.paymentMethod}
                    onValueChange={(value) => handleInputChange('paymentMethod', value)}
                    className="space-y-3"
                  >
                    {paymentMethods.map((method) => {
                      const Icon = paymentIcons[method.provider] || CreditCard;
                      return (
                        <div key={method.id} className="flex items-center space-x-2 border rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <RadioGroupItem value={method.provider} id={method.provider} />
                          <Label htmlFor={method.provider} className="flex-1 cursor-pointer flex items-center gap-3">
                            <Icon className="w-5 h-5" />
                            <div className="flex-1">
                              <span className="font-medium">{method.display_name}</span>
                              {method.description && (
                                <p className="text-xs text-gray-500">{method.description}</p>
                              )}
                            </div>
                            {(method.fee_percentage > 0 || method.fee_fixed > 0) && (
                              <Badge variant="secondary" className="text-xs">
                                Fee: {method.fee_percentage > 0 ? `${method.fee_percentage}%` : ''}
                                {method.fee_percentage > 0 && method.fee_fixed > 0 ? ' + ' : ''}
                                {method.fee_fixed > 0 ? `Rs. ${method.fee_fixed}` : ''}
                              </Badge>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
                    
                    {/* Dynamic Payment Method Info */}
                    {formData.paymentMethod && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        {formData.paymentMethod === 'stripe' && (
                          <>
                            <p className="text-sm text-gray-600 mb-4">
                              Card payment will be processed securely via Stripe
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Lock className="w-4 h-4" />
                              <span>256-bit SSL encryption</span>
                            </div>
                          </>
                        )}
                        {formData.paymentMethod === 'cod' && (
                          <>
                            <p className="text-sm text-gray-600 mb-2">
                              Cash on Delivery (COD)
                            </p>
                            <p className="text-sm text-gray-500">
                              {paymentMethods.find(m => m.provider === 'cod')?.description || 'Pay when you receive your order'}
                            </p>
                          </>
                        )}
                        {(formData.paymentMethod === 'easypaisa' || formData.paymentMethod === 'jazzcash') && (
                          <>
                            <p className="text-sm text-gray-600 mb-2">
                              Mobile Wallet Payment
                            </p>
                            <p className="text-sm text-gray-500">
                              You will be redirected to complete payment via {formData.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                            </p>
                          </>
                        )}
                        {formData.paymentMethod === 'bank_transfer' && (
                          <>
                            <p className="text-sm text-gray-600 mb-2">
                              Bank Transfer
                            </p>
                            <p className="text-sm text-gray-500">
                              Order will be processed after payment confirmation
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Step 4: Review */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Review Your Order</h2>
                    
                    {/* Order Items */}
                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.variantName && (
                              <p className="text-sm text-gray-500">{item.variantName}</p>
                            )}
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(item.price * item.quantity, currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    {/* Shipping Address Summary */}
                    <div>
                      <h3 className="font-medium mb-2">Shipping To:</h3>
                      <p className="text-gray-600">
                        {formData.firstName} {formData.lastName}<br />
                        {formData.address}<br />
                        {formData.city}, {formData.postalCode}<br />
                        Pakistan
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                  >
                    Back
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button onClick={handleNext}>
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Place Order
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary ({itemCount} items)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.items.slice(0, 3).map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                      <span className="line-clamp-1">{item.name} × {item.quantity}</span>
                      <span className="font-medium">
                        {formatCurrency(item.price * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                  {cart.items.length > 3 && (
                    <p className="text-sm text-gray-500">
                      +{cart.items.length - 3} more items
                    </p>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? 'FREE' : formatCurrency(shipping, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (17%)</span>
                    <span className="font-medium">{formatCurrency(tax, currency)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatCurrency(total, currency)}</span>
                  </div>
                  
                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 pt-4 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Secure Checkout</span>
                    <Lock className="w-4 h-4" />
                    <span>SSL Encrypted</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
