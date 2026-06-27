import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, Mail, Phone, MapPin, TrendingUp, Edit, Trash2, User, Building2, CreditCard, Eye, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from './DataTable';
import { ExportButton } from './ExportButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormError, FormWarning } from '@/components/ui/form-error';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { formatCurrency } from '@/lib/currency';
import { customerSchema, validateForm, formatPakistaniPhone } from '@/lib/validation';
import { getDomainColors } from '@/lib/domainColors';
import { getDomainCustomerColumns } from '@/lib/utils/domainHelpers';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import StakeholderLedger from './StakeholderLedger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { useBusiness } from '@/lib/context/BusinessContext';

export function CustomerManager({ customers = [], onAdd, onUpdate, onDelete, category = 'retail-shop', businessId }) {
  const colors = getDomainColors(category);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerToView, setCustomerToView] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const { currency: businessCurrency } = useBusiness();
  const knowledge = getDomainKnowledge(category);
  const currency = businessCurrency || 'PKR';

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const domainColumns = getDomainCustomerColumns(category);

  const columns = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shadow-sm" style={{ border: `2px solid ${colors.primary}20` }}>
            <AvatarFallback className="font-bold" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}>{row.original.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-gray-900 leading-none">{row.original.name}</p>
            <p className="text-xs text-gray-500 mt-1">{row.original.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Phone className="w-3.5 h-3.5" style={{ color: colors.primary }} />
          {row.original.phone}
        </div>
      )
    },
    {
      accessorKey: 'totalOrders',
      header: 'Orders',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold border-gray-200">
          {row.original.totalOrders || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalSpent',
      header: 'Total Value',
      cell: ({ row }) => (
        <span className="font-semibold" style={{ color: colors.primary }}>
          {formatCurrency(row.original.totalSpent || 0, currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={
          row.original.status === 'active'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }>
          {row.original.status || 'active'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 rounded-full hover:bg-gray-100" onClick={() => setCustomerToView(row.original)} title="View Details">
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 rounded-full" style={{ '--hover-bg': `${colors.primary}10`, '--hover-text': colors.primary }} onClick={() => onUpdate?.(row.original)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => setCustomerToDelete(row.original)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Merge dynamic columns
  const allColumns = [...columns.slice(0, 2), ...domainColumns, ...columns.slice(2)];




  return (
    <div className="space-y-4 lg:space-y-6">
      <MobileTabHeader
        icon={User}
        iconClassName="bg-emerald-100 text-emerald-600"
        title="Customer Database"
        subtitle={`${customers.length} clients · ${knowledge?.name || 'Business'}`}
        primaryAction={{
          label: 'Add',
          icon: Plus,
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg',
          onClick: () => onAdd?.(),
        }}
      />

      <MobileStatStrip
        items={[
          { label: 'Total', value: customers.length },
          { label: 'Reachable', value: customers.filter((c) => c.phone || c.email).length, valueTone: 'text-emerald-600' },
          { label: 'With Email', value: customers.filter((c) => c.email).length },
        ]}
      />

      <div className="hidden flex-col gap-4 md:flex-row md:items-center md:justify-between lg:flex">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Database</h2>
          <p className="font-medium text-gray-500">Manage and nurture your {knowledge?.name || 'Business'} clientele</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={filteredCustomers}
            filename="customers"
            columns={columns}
            title="Customers Report"
          />
          <Button onClick={onAdd} className="h-10 rounded-xl px-6 font-bold text-white shadow-lg" style={{ backgroundColor: colors.primary, boxShadow: `0 8px 16px -4px ${colors.primary}40` }}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
        </div>
      </div>

      <Card className="border-wine/10 shadow-xl bg-white/50 backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-wine w-4 h-4 transition-colors" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-white/50 border-gray-100 focus:border-wine/30 focus:ring-wine/20 rounded-xl"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable category={category} data={filteredCustomers} columns={allColumns} emptyComponent={<EmptyState module="customers" compact onAction={onAdd} />} />
        </CardContent>
      </Card>


      {/* View Customer Dialog */}
      <Dialog open={!!customerToView} onOpenChange={(open) => !open && setCustomerToView(null)}>
        <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full max-h-[min(90vh,800px)] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              {customerToView?.name}
            </DialogTitle>
            <DialogDescription>Customer Profile</DialogDescription>
          </DialogHeader>
            <Tabs defaultValue="profile" className="mt-4 min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100/50 p-1 rounded-xl">
              <TabsTrigger value="profile" className="rounded-lg">Profile Info</TabsTrigger>
              <TabsTrigger value="ledger" className="rounded-lg">Ledger / History</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 py-2 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-gray-400 block">Email</label>
                  <p className="font-medium">{customerToView?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block">Phone</label>
                  <p className="font-medium">{customerToView?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block">Total Spent</label>
                  <p className="font-semibold" style={{ color: colors.primary }}>
                    {formatCurrency(customerToView?.totalSpent || 0, currency)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block">Orders</label>
                  <p className="font-medium">{customerToView?.totalOrders || 0}</p>
                </div>
              </div>
              {customerToView?.domain_data && Object.keys(customerToView.domain_data).length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg mt-2 font-bold">
                  <h4 className="text-xs font-bold text-gray-500 mb-2">Domain Data</h4>
                  <div className="text-xs space-y-1">
                    {Object.entries(customerToView.domain_data).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize text-gray-500">{k.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ledger" className="mt-0 pt-2 h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              <StakeholderLedger
                entityId={customerToView?.id}
                entityType="customer"
                businessId={businessId}
                currency={currency}
                colors={colors}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-bold text-gray-900">{customerToDelete?.name}</span>?
              All associated history will be archived.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setCustomerToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (customerToDelete) {
                onDelete?.(customerToDelete.id);
                setCustomerToDelete(null);
              }
            }}>
              Remove Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}








