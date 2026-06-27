'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Phone, Mail, MapPin, TrendingUp, Edit, Trash2, Plus, Search, Loader2, Sparkles, Eye, AlertTriangle, FileText, CheckCircle, ImagePlus, ShieldCheck, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from './DataTable';
import { ExportButton } from './ExportButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/currency';
import { getDomainColors } from '@/lib/domainColors';
import { FormError } from '@/components/ui/form-error';
import { getDomainVendorFields, getDomainVendorColumns, normalizeKey } from '@/lib/utils/domainHelpers';
import { DomainFieldRenderer } from './domain/DomainFieldRenderer';
import toast from 'react-hot-toast';
import StakeholderLedger from './StakeholderLedger';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { validateNTN, formatNTN } from '@/lib/tax/pakistaniTax';
import { formatPakistaniPhone, isValidPakistaniPhone, vendorSchema, validateForm } from '@/lib/validation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { FileUpload } from './FileUpload';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Badge } from '@/components/ui/badge';

/**
 * Vendor Manager Component
 * Handles supplier database with Supabase integration
 */
export function VendorManager({ vendors = [], onAdd, onUpdate, onDelete, category = 'retail-shop', businessId }) {
  const { business } = useBusiness();
  const colors = getDomainColors(category);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorToView, setVendorToView] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const domainFields = getDomainVendorFields(category);

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const domainColumns = getDomainVendorColumns(category);

  const columns = [
    {
      accessorKey: 'name',
      header: 'Supplier',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary }}>
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-none">{row.original.name}</p>
            <p className="text-xs text-gray-500 mt-1">{row.original.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="flex flex-col text-sm text-gray-600 font-medium">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3 h-3" style={{ color: colors.primary }} />
            {row.original.phone}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'outstanding_balance',
      header: 'Payables',
      cell: ({ row }) => (
        <span className={`font-semibold ${Number(row.original.outstanding_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(row.original.outstanding_balance || 0, 'PKR')}
        </span>
      ),
    },
    {
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
          <MapPin className="w-3 h-3" style={{ color: colors.primary }} />
          {row.original.city || 'Pakistan'}
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 rounded-full hover:bg-gray-100"
            onClick={() => setVendorToView(row.original)}
            title="View Details"
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 rounded-full hover:bg-gray-100"
            style={{ color: colors.primary }}
            title="Edit Supplier"
            onClick={() => onUpdate?.(row.original)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
            onClick={() => setVendorToDelete(row.original)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Merge dynamic columns: Supplier, Contact, Payables, [Domain], Location, Actions
  const allColumns = [
    columns[0], // Supplier
    columns[1], // Contact
    columns[2], // Payables
    ...domainColumns,
    columns[3], // Location
    columns[4], // Actions
  ];

  const handleOpenAdd = () => {
    onAdd?.();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <MobileTabHeader
        icon={Building2}
        iconClassName="bg-blue-100 text-blue-600"
        title="Vendor Network"
        subtitle={`${vendors.length} suppliers · supply chain`}
        primaryAction={{
          label: 'Add',
          icon: Plus,
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          onClick: handleOpenAdd,
        }}
      />

      <MobileStatStrip
        items={[
          { label: 'Vendors', value: vendors.length },
          {
            label: 'Payables',
            value: formatCurrency(vendors.reduce((s, v) => s + (Number(v.outstanding_balance) || 0), 0), 'PKR'),
            valueTone: 'text-red-600',
          },
        ]}
      />

      <div className="hidden flex-col gap-4 md:flex-row md:items-center md:justify-between lg:flex">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vendor Network</h2>
          <p className="font-medium text-gray-500">Manage your supply chain and trade credit</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenAdd}
            className="h-10 rounded-xl px-5 font-bold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
          <ExportButton
            data={filteredVendors}
            filename="vendors"
            columns={columns}
            title="Suppliers Report"
          />
        </div>
      </div>

      <div className="hidden grid-cols-1 gap-4 md:grid-cols-4 lg:grid">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Active Vendors</p>
            <p className="text-2xl font-semibold text-gray-900">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Total Payables</p>
            <p className="text-2xl font-semibold text-red-600">
              {formatCurrency(vendors.reduce((s, v) => s + (Number(v.outstanding_balance) || 0), 0), 'PKR')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-wine/5 shadow-xl bg-white/50 backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-wine w-4 h-4 transition-colors" />
            <Input
              placeholder="Search by company name or NTN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-gray-100 focus:border-wine/30 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable category={category} data={filteredVendors} columns={allColumns} emptyComponent={<EmptyState module="vendors" compact onAction={onAdd} />} />
        </CardContent>
      </Card>

      {/* View Vendor Dialog */}
      <Dialog open={!!vendorToView} onOpenChange={(open) => !open && setVendorToView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              {vendorToView?.name}
            </DialogTitle>
            <DialogDescription>Supplier Details & History</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto px-6 pb-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100/50 p-1 rounded-xl">
                <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Profile Details</TabsTrigger>
                <TabsTrigger value="ledger" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Ledger / History</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 py-2 mt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-bold text-gray-400 block">Contact Person</label>
                    <p className="font-medium">{vendorToView?.domain_data?.contact_person || vendorToView?.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block">City</label>
                    <p className="font-medium">{vendorToView?.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block">Phone</label>
                    <p className="font-medium">{vendorToView?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 block">NTN</label>
                    <p className="font-medium">{vendorToView?.ntn || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-400 block">Address</label>
                    <p className="font-medium">{vendorToView?.address || 'N/A'}</p>
                  </div>
                </div>

                {vendorToView?.domain_data && Object.keys(vendorToView.domain_data).length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg mt-2 font-bold">
                    <h4 className="text-xs font-bold text-gray-500 mb-2">Domain Data</h4>
                    <div className="text-xs space-y-1">
                      {Object.entries(vendorToView.domain_data).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="capitalize text-gray-500">{k.replace(/_/g, ' ')}:</span>
                          <span className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ledger" className="mt-0 pt-2 min-h-[400px]">
                <StakeholderLedger
                  entityId={vendorToView?.id}
                  entityType="vendor"
                  businessId={businessId}
                  currency="PKR"
                  colors={colors}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!vendorToDelete} onOpenChange={(open) => !open && setVendorToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-bold text-gray-900">{vendorToDelete?.name}</span>?
              This will remove them from your active suppliers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setVendorToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (vendorToDelete) {
                onDelete?.(vendorToDelete.id);
                setVendorToDelete(null);
              }
            }}>
              Remove Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
