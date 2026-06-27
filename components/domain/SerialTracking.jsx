'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { Plus, Trash2, Hash, Scan, ShieldCheck, ShieldAlert, History, Laptop } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { toast } from 'react-hot-toast';

const getSerialLabel = (category) => {
  switch (category) {
    case 'mobile-phones':
    case 'telecom': return 'IMEI / Serial No';
    case 'auto-parts': return 'Chassis / Engine No';
    case 'electronics': return 'Product Serial (SN)';
    default: return 'Serial Number';
  }
};
export function SerialNumberInput({
  value = [],
  onChange,
  product = {},
  category = 'computer-hardware'
}) {
  const [serialNumbers, setSerialNumbers] = useState(value);
  const [showScanner, setShowScanner] = useState(false);
  const [newSerial, setNewSerial] = useState({
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyStartDate: new Date().toISOString().split('T')[0],
    warrantyMonths: product.warrantyMonths || 12,
  });

  const stats = useMemo(() => ({
    total: serialNumbers.length,
    available: serialNumbers.filter(s => s.status === 'available').length,
    inWarranty: serialNumbers.filter(s => {
      if (!s.warrantyEndDate) return false;
      return new Date(s.warrantyEndDate) > new Date();
    }).length
  }), [serialNumbers]);

  const calculateWarrantyEnd = (start, months) => {
    const date = new Date(start);
    date.setMonth(date.getMonth() + parseInt(months));
    return date.toISOString().split('T')[0];
  };

  const isPersisted = (id) => {
    if (!id) return false;
    if (typeof id === 'string') return true;
    if (typeof id === 'number' && id < 1000000000000) return true;
    return false;
  };

  const handleAddSerial = useCallback(() => {
    if (!newSerial.serialNumber.trim()) return;

    // Check for duplicates
    if (serialNumbers.some(s => s.serialNumber === newSerial.serialNumber.trim().toUpperCase())) {
      toast.error('Serial number already registered');
      return;
    }

    const serial = {
      ...newSerial,
      id: Date.now(),
      serialNumber: newSerial.serialNumber.trim().toUpperCase(),
      warrantyEndDate: calculateWarrantyEnd(newSerial.warrantyStartDate, newSerial.warrantyMonths),
      status: 'available'
    };

    const updated = [...serialNumbers, serial];
    setSerialNumbers(updated);
    onChange?.(updated);

    setNewSerial(prev => ({ ...prev, serialNumber: '' }));
  }, [newSerial, serialNumbers, onChange]);

  const removeSerial = useCallback((id) => {
    const updated = serialNumbers.filter(s => s.id !== id);
    setSerialNumbers(updated);
    onChange?.(updated);
  }, [serialNumbers, onChange]);

  const getWarrantyStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    if (end < today) return { label: 'Expired', color: 'bg-red-500', icon: ShieldAlert };
    return { label: 'Active Warranty', color: 'bg-emerald-500', icon: ShieldCheck };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50 border-slate-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-lg"><Laptop className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Tracked Units</p>
                <p className="text-xl font-semibold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg"><ShieldCheck className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase">In Warranty</p>
                <p className="text-xl font-semibold text-emerald-900">{stats.inWarranty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg"><History className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase">Available</p>
                <p className="text-xl font-semibold text-indigo-900">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Serial Entry</CardTitle>
            <CardDescription>Individual unit registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{getSerialLabel(category)}</Label>
              <div className="flex gap-2">
                <Input
                  value={newSerial.serialNumber}
                  onChange={e => setNewSerial({ ...newSerial, serialNumber: e.target.value })}
                  placeholder="Scan or type..."
                  className="font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleAddSerial()}
                />
                <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
                  <Scan className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Warranty Period (Months)</Label>
              <Input
                type="number"
                value={newSerial.warrantyMonths}
                onChange={e => setNewSerial({ ...newSerial, warrantyMonths: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Warranty Start Date</Label>
              <DatePicker
                value={newSerial.warrantyStartDate}
                onChange={d => setNewSerial({ ...newSerial, warrantyStartDate: d })}
              />
            </div>

            <Button onClick={handleAddSerial} className="w-full bg-slate-900 hover:bg-slate-800 font-bold">
              <Plus className="w-4 h-4 mr-2" /> Register Unit
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {serialNumbers.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
              <Hash className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No serial numbers registered yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {serialNumbers.map((s, idx) => {
                const status = getWarrantyStatus(s.warrantyEndDate);
                const Icon = status.icon;
                return (
                  <div key={s.id || idx} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg text-gray-400">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-gray-900 tracking-wider uppercase">{s.serialNumber}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge className={`${status.color} text-white border-0 text-[10px] flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {status.label}
                          </Badge>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Ends: {s.warrantyEndDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-100 uppercase text-[10px]">{s.status}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSerial(s.id)}
                        disabled={isPersisted(s.id)}
                        className={cn(
                          "h-8 w-8 transition-colors",
                          isPersisted(s.id) ? "text-gray-200 cursor-not-allowed" : "text-gray-300 hover:text-red-500"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setNewSerial(prev => ({ ...prev, serialNumber: code }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
