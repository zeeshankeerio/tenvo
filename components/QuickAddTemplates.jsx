'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Package, ShoppingCart } from 'lucide-react';
import { getTemplatesForDomain, normalizeProductTemplate } from '@/lib/data/productTemplates';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * Quick Add Templates Component
 * Allows users to quickly add pre-configured products
 */
export function QuickAddTemplates({
    domain,
    onAddProduct,
    currency = 'PKR',
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    hideTrigger = false,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (next) => {
        if (!isControlled) setInternalOpen(next);
        controlledOnOpenChange?.(next);
    };
    const templates = getTemplatesForDomain(domain);

    if (templates.length === 0) {
        return null;
    }

    const handleAddTemplate = (template) => {
        onAddProduct(normalizeProductTemplate(template, domain));
        toast.success(`Added ${template.name} to inventory`);
        setOpen(false);
    };

    const handleAddAll = () => {
        templates.forEach((template) => {
            onAddProduct(normalizeProductTemplate(template, domain));
        });
        toast.success(`Added ${templates.length} products to inventory`);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!hideTrigger && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Quick Add Products
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Popular Products for Your Business
                    </DialogTitle>
                    <DialogDescription>
                        Add pre-configured products with realistic Pakistani market pricing
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {templates.length} products available
                        </p>
                        <Button onClick={handleAddAll} size="sm" variant="secondary">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add All
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map((template, index) => (
                            <Card key={index} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">{template.name}</CardTitle>
                                    {template.brand && (
                                        <CardDescription>
                                            <Badge variant="secondary">{template.brand}</Badge>
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        {template.category && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Category:</span>
                                                <span className="font-medium">{template.category}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Price:</span>
                                            <span className="font-bold text-green-600">
                                                {formatCurrency(template.price, currency)}
                                            </span>
                                        </div>
                                        {template.costPrice && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Cost:</span>
                                                <span className="font-medium">
                                                    {formatCurrency(template.costPrice, currency)}
                                                </span>
                                            </div>
                                        )}
                                        {template.unit && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Unit:</span>
                                                <span className="font-medium">{template.unit}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleAddTemplate(template)}
                                        className="w-full mt-4"
                                        size="sm"
                                    >
                                        Add Product
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
