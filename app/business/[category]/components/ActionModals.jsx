'use client';
// v2: Removed ActionModalsHeader

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus,
    FileText,
    Package,
    Users,
    Settings,
    Warehouse,
    BarChart3,
    Truck,
    ShoppingCart,
} from 'lucide-react';
import { VendorForm } from '@/components/VendorForm';
import EnhancedPOBuilder from '@/components/EnhancedPOBuilder';
import { ProductForm } from '@/components/ProductForm';
import { ProductWizard } from '@/components/inventory/ProductWizard';
import { EnhancedInvoiceBuilder } from '@/components/EnhancedInvoiceBuilder';
import { QuickInvoiceModal } from '@/components/invoice/QuickInvoiceModal';
import { PaymentModal } from '@/components/invoice/PaymentModal';
import { CustomerForm } from '@/components/CustomerForm';
import toast from 'react-hot-toast';
import { EntityDetailsDialog } from '@/components/EntityDetailsDialog';
import { getNavItemAccess } from '@/lib/rbac/permissions';
import { isPosRelevant } from '@/lib/config/domains';

export function ActionModals({
    // Visibility States
    showProductForm,
    setShowProductForm,
    showQuickAction,
    setShowQuickAction,
    showQuickInvoice,
    setShowQuickInvoice,
    showCustomerForm,
    setShowCustomerForm,
    showInvoiceBuilder,
    setShowInvoiceBuilder,
    showPaymentModal,
    setShowPaymentModal,
    selectedInvoiceForPayment,
    setSelectedInvoiceForPayment,

    // Data
    editingProduct,
    setEditingProduct,
    editingCustomer,
    setEditingCustomer,
    invoiceInitialData,
    setInvoiceInitialData,
    customerFormData,
    setCustomerFormData,
    products,
    customers,
    invoices,
    category,
    colors,
    currency,

    // Handlers
    onSaveProduct,
    onSaveCustomer,
    onSaveInvoice,
    onTabChange,
    formatCurrency,
    loadProducts,

    // Vendor Props
    showVendorForm,
    setShowVendorForm,
    editingVendor,
    setEditingVendor,
    onSaveVendor,

    // PO Props
    showPOBuilder,
    setShowPOBuilder,
    poInitialData,
    setPoInitialData,
    refreshData,
    business,
    role = 'owner',
    planTier = 'free',
    domainKnowledge,

    // Details Viewer Props
    viewingItem,
    setViewingItem,
    viewingType,
    setViewingType,
    // User
    user
}) {
    const posRelevant = isPosRelevant(category, domainKnowledge);

    const canOpenTab = (tabKey) => {
        const access = getNavItemAccess(tabKey, role, planTier, business?.settings);
        if (!access.visible) return false;
        if (access.locked) {
            toast.error(`Requires ${access.requiredPlan || 'higher'} plan`);
            return false;
        }
        return true;
    };

    const safeTabChange = (tabKey) => {
        if (!canOpenTab(tabKey)) return;
        onTabChange(tabKey);
        setShowQuickAction(false);
    };

    return (
        <>
            <EntityDetailsDialog
                item={viewingItem}
                type={viewingType}
                open={!!viewingItem}
                onClose={() => {
                    setViewingItem(null);
                    setViewingType(null);
                }}
                category={category}
            />

            {/* Product Form Modal -- Wizard for new, Full form for edit */}
            <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
                <DialogContent
                    className={
                        editingProduct
                            ? 'flex max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full'
                            : 'flex max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden border-none bg-transparent p-2 shadow-none sm:w-full'
                    }
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'Modify the details of the selected product.' : 'Add a new product using the guided wizard.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {editingProduct ? (
                        <ProductForm
                            product={editingProduct}
                            category={category}
                            onSave={onSaveProduct}
                            onCancel={() => {
                                setShowProductForm(false);
                                setEditingProduct(null);
                            }}
                            currency={currency}
                        />
                    ) : (
                        <ProductWizard
                            category={category}
                            onSave={async (data) => {
                                await onSaveProduct?.(data);
                                setShowProductForm(false);
                            }}
                            onCancel={() => {
                                setShowProductForm(false);
                                setEditingProduct(null);
                            }}
                            currency={currency}
                        />
                    )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Action Modal */}
            <Dialog open={showQuickAction} onOpenChange={setShowQuickAction}>
                <DialogContent className="max-w-xl rounded-2xl border-none p-4 shadow-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
                            <span className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
                                <Plus className="w-6 h-6" />
                            </span>
                            Quick Actions
                        </DialogTitle>
                        <DialogDescription>Select a task to jump directly into action</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {[
                            { label: 'Quick Checkout', icon: FileText, action: () => { setShowQuickInvoice(true); setShowQuickAction(false); } },
                            { label: 'New Invoice', icon: FileText, action: () => { setShowInvoiceBuilder(true); setShowQuickAction(false); } },
                            { label: 'Add Product', icon: Package, action: () => { setEditingProduct(null); setShowProductForm(true); setShowQuickAction(false); } },
                            { label: 'New Customer', icon: Users, action: () => { setShowCustomerForm(true); setShowQuickAction(false); } },
                            { label: 'New Vendor', icon: Truck, action: () => { setEditingVendor(null); setShowVendorForm(true); setShowQuickAction(false); } },
                            { label: 'New Purchase', icon: ShoppingCart, action: () => { setPoInitialData(null); setShowPOBuilder(true); setShowQuickAction(false); } },
                            { label: 'Record Stock', icon: Warehouse, action: () => safeTabChange('inventory') },
                            { label: 'View Reports', icon: BarChart3, action: () => safeTabChange('reports') },
                            { label: 'Manage Settings', icon: Settings, action: () => safeTabChange('settings') },
                            ...(posRelevant ? [{ label: 'Campaigns', icon: BarChart3, action: () => safeTabChange('campaigns') }] : []),
                        ].map((item, i) => (
                            <button
                                key={i}
                                onClick={item.action}
                                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-100 hover:shadow-xl transition-all group text-left"
                            >
                                <div className="p-3 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform" style={{ color: colors.primary }}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-900">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showCustomerForm} onOpenChange={(open) => {
                setShowCustomerForm(open);
                if (!open) setEditingCustomer(null);
            }}>
                <DialogContent hideCloseButton className="flex max-h-[min(92vh,860px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden border-none bg-transparent p-0 shadow-none sm:w-full">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Customer Form</DialogTitle>
                    </DialogHeader>
                    <CustomerForm
                        initialData={editingCustomer}
                        category={category}
                        onSave={onSaveCustomer}
                        onEntitlementError={() => {
                            setShowCustomerForm(false);
                            setEditingCustomer(null);
                            onTabChange('settings');
                        }}
                        onClose={() => {
                            setShowCustomerForm(false);
                            setEditingCustomer(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Invoice Builder */}
            {showInvoiceBuilder && (
                <EnhancedInvoiceBuilder
                    onClose={() => {
                        setShowInvoiceBuilder(false);
                        setInvoiceInitialData(null);
                    }}
                    onSave={onSaveInvoice}
                    products={products}
                    customers={customers}
                    category={category}
                    initialData={invoiceInitialData}
                />
            )}

            <QuickInvoiceModal
                isOpen={showQuickInvoice}
                onClose={() => setShowQuickInvoice(false)}
                onSave={onSaveInvoice}
                businessId={business?.id}
                category={category}
                products={products}
                customers={customers}
                recentTransactions={invoices}
                currency={currency}
            />

            <Dialog open={showVendorForm} onOpenChange={(open) => {
                setShowVendorForm(open);
                if (!open) setEditingVendor(null);
            }}>
                <DialogContent hideCloseButton className="flex max-h-[min(92vh,860px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden border-none bg-transparent p-0 shadow-none sm:w-full">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Vendor Form</DialogTitle>
                    </DialogHeader>
                    <VendorForm
                        initialData={editingVendor}
                        category={category}
                        onSave={onSaveVendor}
                        onEntitlementError={() => {
                            setShowVendorForm(false);
                            setEditingVendor(null);
                            onTabChange('settings');
                        }}
                        onClose={() => {
                            setShowVendorForm(false);
                            setEditingVendor(null);
                        }}
                        business={business}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={showPOBuilder} onOpenChange={setShowPOBuilder}>
                <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none overflow-visible">
                    <div className="sr-only">
                        <DialogTitle>Purchase Order Builder</DialogTitle>
                    </div>
                    <EnhancedPOBuilder
                        businessId={business?.id}
                        category={category}
                        colors={colors}
                        onSuccess={() => {
                            setShowPOBuilder(false);
                            refreshData?.();
                        }}
                        onCancel={() => setShowPOBuilder(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoiceForPayment && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedInvoiceForPayment(null);
                    }}
                    invoice={selectedInvoiceForPayment}
                    currency={currency}
                    onRecordPayment={async (paymentData) => {
                        const { recordInvoicePaymentAction } = await import('@/lib/actions/standard/invoice-payments');
                        const result = await recordInvoicePaymentAction({
                            businessId: business?.id,
                            invoiceId: selectedInvoiceForPayment.id,
                            amount: paymentData.amount,
                            paymentMethod: paymentData.paymentMethod,
                            paymentDate: paymentData.paymentDate,
                            referenceNumber: paymentData.referenceNumber,
                            notes: paymentData.notes,
                            userId: user?.id
                        });

                        if (result.success) {
                            setShowPaymentModal(false);
                            setSelectedInvoiceForPayment(null);
                            refreshData?.();
                        } else {
                            throw new Error(result.error || 'Failed to record payment');
                        }
                    }}
                />
            )}

        </>
    );
}
