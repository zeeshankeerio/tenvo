/**
 * Inventory Tab - Server Component with Client Islands
 * Displays product inventory with search, filters, and management
 */

import { Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InventoryManager } from '@/components/InventoryManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { Product, Invoice, Customer } from '@/types';

interface InventoryTabProps {
    products: Product[];
    businessId: string;
    category: string;
    onProductSave?: (data: any) => Promise<void>;
    onProductDelete?: (id: string) => Promise<void>;
    refreshData?: () => Promise<void>;
    domainKnowledge?: any;
    invoices?: Invoice[];
    customers?: Customer[];
    vendors?: any[];
    locations?: any[];
    bomList?: any[];
    productionOrders?: any[];
    quotations?: any[];
    salesOrders?: any[];
    challans?: any[];
    onIssueInvoice?: (header: any) => void;
    onAdd?: () => void;
    onQuickAdd?: (data: any) => void;
    onEdit?: (product: Product) => void;
    onUpdate?: (data: any) => void;
    onLocationAdd?: (data: any) => void;
    onLocationUpdate?: (id: string, data: any) => void;
    onLocationDelete?: (id: string) => void;
    onStockTransfer?: (data: any) => void;
    onGeneratePO?: (data: any) => void;
    isLoading?: boolean;
}

export function InventoryTab({
    products,
    businessId,
    category,
    onProductSave,
    onProductDelete,
    refreshData,
    domainKnowledge,
    invoices,
    customers,
    vendors,
    locations,
    bomList,
    productionOrders,
    quotations,
    salesOrders,
    challans,
    onIssueInvoice,
    onAdd,
    onQuickAdd,
    onEdit,
    onUpdate,
    onLocationAdd,
    onLocationUpdate,
    onLocationDelete,
    onStockTransfer,
    onGeneratePO,
    isLoading = false,
}: InventoryTabProps) {
    if (isLoading && products.length === 0) {
        return (
            <div className="space-y-5">
                <ErrorBoundary>
                    <InventorySkeleton />
                </ErrorBoundary>
            </div>
        );
    }

    return (
        <div className="space-y-5">

            {/* Inventory Manager - Client Component */}
            <ErrorBoundary>
                <Suspense fallback={<InventorySkeleton />}>
                    <InventoryManager
                        products={products}
                        businessId={businessId}
                        category={category}
                        onUpdate={onUpdate || onProductSave}
                        onDelete={onProductDelete}
                        refreshData={refreshData}
                        domainKnowledge={domainKnowledge}
                        invoices={invoices}
                        customers={customers}
                        vendors={vendors}
                        locations={locations}
                        bomList={bomList}
                        productionOrders={productionOrders}
                        quotations={quotations}
                        salesOrders={salesOrders}
                        challans={challans}
                        onIssueInvoice={onIssueInvoice}
                        onAdd={onAdd}
                        onQuickAdd={onQuickAdd}
                        onEdit={onEdit}
                        onLocationAdd={onLocationAdd}
                        onLocationUpdate={onLocationUpdate}
                        onLocationDelete={onLocationDelete}
                        onStockTransfer={onStockTransfer}
                        onGeneratePO={onGeneratePO}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

function InventorySkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
