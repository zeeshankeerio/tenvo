'use client';

/**
 * Customers Tab - Client wrapper for interactive list + mobile header
 */

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, MapPin, Pencil, Trash2, Plus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { ExportButton } from '@/components/ExportButton';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { CustomerMembershipBadge } from '@/components/crm/CustomerMembershipBadge';
import { useMembershipVerticalCustomers } from '@/lib/hooks/useCustomerMembershipMap';
import {
    countActiveMembersInList,
    countPendingMembersInList,
} from '@/lib/memberships/membershipTypes';
import type { Customer } from '@/types';

interface CustomersTabProps {
    customers: Customer[];
    onCustomerDelete?: (id: string) => Promise<void>;
    onUpdate?: (customer: Customer) => void;
    onAdd?: () => void;
    category?: string;
    businessId?: string;
}

export function CustomersTab({
    customers,
    onCustomerDelete,
    onUpdate,
    onAdd,
    category = 'retail-shop',
    businessId,
}: CustomersTabProps) {
    const router = useRouter();
    const params = useParams();
    const { enabled: membershipEnabled, byCustomerId, getForCustomer } =
        useMembershipVerticalCustomers(category, businessId);

    const openMembershipsTab = () => {
        const handle = (params?.category as string) || category;
        router.push(`/business/${handle}?tab=memberships`, { scroll: false });
    };

    const customerIds = customers.map((c) => c.id);
    const activeMemberCount = membershipEnabled
        ? countActiveMembersInList(customerIds, byCustomerId)
        : 0;
    const pendingMemberCount = membershipEnabled
        ? countPendingMembersInList(customerIds, byCustomerId)
        : 0;

    const reachableCount = customers.filter((c) => c.phone || c.email).length;
    const activeCustomerCount = customers.filter((c) => c.is_active !== false).length;

    return (
        <div className="space-y-4 lg:space-y-6">
            <MobileTabHeader
                icon={Users}
                iconClassName="bg-emerald-100 text-emerald-600"
                title="Customers"
                subtitle={`${customers.length} in database`}
                primaryAction={{
                    label: 'Add',
                    icon: Plus,
                    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    onClick: () => onAdd?.(),
                }}
            />

            <MobileStatStrip
                items={[
                    { label: 'Total', value: customers.length },
                    { label: 'Reachable', value: reachableCount, valueTone: 'text-emerald-600' },
                    ...(membershipEnabled
                        ? [
                              {
                                  label: 'Active members',
                                  value: activeMemberCount,
                                  valueTone: 'text-violet-600',
                              },
                              ...(pendingMemberCount > 0
                                  ? [
                                        {
                                            label: 'Pending',
                                            value: pendingMemberCount,
                                            valueTone: 'text-amber-600',
                                        },
                                    ]
                                  : []),
                          ]
                        : [{ label: 'Cities', value: new Set(customers.map((c) => c.city).filter(Boolean)).size }]),
                ]}
            />

            {/* Desktop header */}
            <div className="hidden items-center justify-between lg:flex">
                <div>
                    <h2 className="text-2xl font-bold">Customers</h2>
                    <p className="text-muted-foreground">
                        Manage your customer database
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        data={customers}
                        filename="customers"
                        columns={[
                            { key: 'name', label: 'Name' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'email', label: 'Email' },
                            { key: 'city', label: 'City' },
                        ]}
                        title="Customers Report"
                    />
                    <Button
                        onClick={() => onAdd?.()}
                        className="h-10 rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </div>
            </div>

            {/* Customer Stats, desktop cards */}
            <div className="hidden grid-cols-1 gap-4 md:grid-cols-3 lg:grid">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Active</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {activeCustomerCount}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>
                            {membershipEnabled ? 'Active members' : 'With Email'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${membershipEnabled ? 'text-violet-600' : 'text-brand-primary'}`}>
                            {membershipEnabled
                                ? activeMemberCount
                                : customers.filter(c => c.email).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Customer List */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer Directory</CardTitle>
                    <CardDescription>
                        {customers.length} customers registered
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        category={category}
                        data={customers}
                        searchable={true}
                        columns={[
                            {
                                accessorKey: 'name',
                                header: 'Customer',
                                cell: ({ row }: { row: { original: Customer } }) => {
                                    const membership = getForCustomer(row.original.id);
                                    return (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-gray-900">{row.original.name}</span>
                                            <span className="text-xs text-muted-foreground">{row.original.email || 'No email'}</span>
                                            {membershipEnabled && membership ? (
                                                <CustomerMembershipBadge
                                                    membership={membership}
                                                    onClick={openMembershipsTab}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                    );
                                }
                            },
                            {
                                accessorKey: 'phone',
                                header: 'Contact',
                                cell: ({ row }: { row: { original: Customer } }) => (
                                    <div className="flex flex-col gap-1">
                                        {row.original.phone && (
                                            <div className="flex items-center gap-1 text-xs">
                                                <Phone className="w-3 h-3 text-muted-foreground" />
                                                <span>{row.original.phone}</span>
                                            </div>
                                        )}
                                        {row.original.city && (
                                            <div className="flex items-center gap-1 text-xs">
                                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                                <span>{row.original.city}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            },
                            {
                                accessorKey: 'status',
                                header: 'Status',
                                cell: ({ row }: { row: { original: Customer } }) => (
                                    <Badge className={row.original.is_active === false ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}>
                                        {row.original.is_active === false ? 'Inactive' : 'Active'}
                                    </Badge>
                                )
                            },
                            {
                                id: 'actions',
                                header: 'Actions',
                                cell: ({ row }: { row: { original: Customer } }) => (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onUpdate?.(row.original)}
                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onCustomerDelete?.(row.original.id)}
                                            className="h-8 w-8 text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
