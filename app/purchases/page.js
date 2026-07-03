'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Filter, Download, MoreVertical,
    FileText, Calendar, User, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { purchaseAPI } from '@/lib/api/purchases';
import { useBusiness } from '@/lib/context/BusinessContext';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

export default function PurchasesPage() {
    const router = useRouter();
    const { business, currency: businessCurrency } = useBusiness();
    const currency = businessCurrency || 'PKR';
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPurchases();
    }, [business]); // Reload if business changes

    const loadPurchases = async () => {
        if (!business) return;
        try {
            setLoading(true);
            // In a real app, we'd filter by business_id in the API call if RLS didn't handle it automatically.
            // But RLS policies I set up use auth.uid() -> business mapping, so basic fetch is safe.
            const data = await purchaseAPI.getAll(business.id);
            setPurchases(data?.purchaseOrders || []);
        } catch (error) {
            console.error('Failed to load purchases:', error);
            toast.error('Could not load purchase history');
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchases = purchases.filter(p =>
        p.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Purchase Invoices</h1>
                    <p className="text-muted-foreground">Manage incoming stock and supplier bills</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button onClick={() => router.push('/purchases/new')}>
                        <Plus className="mr-2 h-4 w-4" /> Record Purchase
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vendor or invoice no..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="ghost" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            {/* Purchase Grid */}
            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-6 gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
                    <div className="col-span-2">Vendor / Invoice</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div className="text-right">Total Amount</div>
                    <div className="text-right">Actions</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading purchases...</div>
                ) : filteredPurchases.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-foreground">No purchases found</h3>
                        <p className="mb-4">Start by recording your first supplier invoice.</p>
                        <Button variant="outline" onClick={() => router.push('/purchases/new')}>
                            Record Purchase
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredPurchases.map((purchase) => (
                            <div key={purchase.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                                <div className="col-span-2">
                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        {purchase.vendor?.name || 'Unknown Vendor'}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        #{purchase.purchase_number}
                                    </div>
                                </div>
                                <div className="text-sm flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {new Date(purchase.date).toLocaleDateString()}
                                </div>
                                <div>
                                    <Badge variant={purchase.status === 'received' ? 'secondary' : 'outline'}>
                                        {purchase.status}
                                    </Badge>
                                </div>
                                <div className="text-right font-bold font-mono">
                                    {formatCurrency(purchase.total_amount, currency)}
                                </div>
                                <div className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/purchases/${purchase.id}`)}>
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                Download PDF
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
