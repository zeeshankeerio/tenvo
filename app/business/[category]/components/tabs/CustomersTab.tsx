/**
 * Customers Tab - Server Component
 * Displays customer list and management
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, MapPin, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import type { Customer } from '@/types';

interface CustomersTabProps {
    customers: Customer[];
    onCustomerDelete?: (id: string) => Promise<void>;
    onUpdate?: (customer: Customer) => void;
    category?: string;
}

export function CustomersTab({
    customers,
    onCustomerDelete,
    onUpdate,
    category = 'retail-shop'
}: CustomersTabProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Customers</h2>
                    <p className="text-muted-foreground">
                        Manage your customer database
                    </p>
                </div>
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            {customers.filter(c => (c as any).is_active !== false).length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>With Email</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-brand-primary">
                            {customers.filter(c => c.email).length}
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
                                cell: ({ row }: any) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{row.original.name}</span>
                                            <span className="text-xs text-muted-foreground">{row.original.email || 'No email'}</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                accessorKey: 'phone',
                                header: 'Contact',
                                cell: ({ row }: any) => (
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
                                cell: ({ row }: any) => (
                                    <Badge className={row.original.is_active === false ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}>
                                        {row.original.is_active === false ? 'Inactive' : 'Active'}
                                    </Badge>
                                )
                            },
                            {
                                id: 'actions',
                                header: 'Actions',
                                cell: ({ row }: any) => (
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
