'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  X,
  ShieldCheck,
  Wrench,
  Car,
  Hash,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Vehicle Compatibility Selector
 * Premium interface for tracking part fitment across vehicle models
 */
export function VehicleCompatibilitySelector({ value = [], onChange }) {
  const [vehicles, setVehicles] = useState(value);
  const [newVehicle, setNewVehicle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const commonVehicles = [
    'Honda City 2020-23',
    'Toyota Corolla Altis 2021',
    'Suzuki Swift 2022',
    'Honda Civic RS 2022',
    'Toyota Fortuner 2021',
    'Suzuki Alto 660cc',
    'Kia Sportage 2021',
    'Hyundai Tucson 2022'
  ];

  const addVehicle = useCallback((name) => {
    const val = name || newVehicle;
    if (!val.trim()) return;
    if (vehicles.includes(val.trim())) return;

    const updated = [...vehicles, val.trim()];
    setVehicles(updated);
    onChange?.(updated);
    setNewVehicle('');
    setSearchQuery('');
  }, [newVehicle, vehicles, onChange]);

  const removeVehicle = useCallback((v) => {
    const updated = vehicles.filter(item => item !== v);
    setVehicles(updated);
    onChange?.(updated);
  }, [vehicles, onChange]);

  const filteredQuickSelect = commonVehicles.filter(v =>
    !vehicles.includes(v) &&
    v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2">
        {vehicles.map((v, i) => (
          <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-100 py-1.5 px-3 flex items-center gap-2 group transition-all hover:bg-red-50 hover:text-red-700 hover:border-red-100">
            <Car className="w-3.5 h-3.5" />
            <span className="font-outfit font-medium uppercase tracking-tight">{v}</span>
            <button onClick={() => removeVehicle(v)} className="opacity-50 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
        <CardContent className="p-0">
          <div className="flex items-center px-4 py-2 border-b border-gray-50">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 placeholder:text-gray-300 font-outfit"
              placeholder="Search or type vehicle model..."
              value={newVehicle || searchQuery}
              onChange={e => {
                setNewVehicle(e.target.value);
                setSearchQuery(e.target.value);
              }}
              onKeyDown={e => e.key === 'Enter' && addVehicle()}
            />
            <Button size="sm" variant="ghost" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50" onClick={() => addVehicle()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {searchQuery && filteredQuickSelect.length > 0 && (
            <div className="p-2 bg-gray-50/50 max-h-32 overflow-y-auto scrollbar-hide">
              <div className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">Suggestions</div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {filteredQuickSelect.map(v => (
                  <button
                    key={v}
                    onClick={() => addVehicle(v)}
                    className="text-left px-2 py-1 text-xs text-gray-600 hover:bg-white hover:text-indigo-600 rounded transition-colors border border-transparent hover:border-indigo-100"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OEMNumberInput({ value, onChange, required = false }) {
  return (
    <div className="space-y-2 group">
      <Label className="flex items-center gap-2 text-gray-600 group-focus-within:text-blue-600 transition-colors">
        <Settings className="w-4 h-4" /> OEM Specification
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Enter OEM Number (e.g. 12345-ABC)"
        className="font-mono bg-gray-50 focus:bg-white border-gray-100 transition-colors uppercase tracking-widest text-sm font-bold"
      />
    </div>
  );
}

export function PartNumberInput({ value, onChange, required = true }) {
  return (
    <div className="space-y-2 group">
      <Label className="flex items-center gap-2 text-gray-600 group-focus-within:text-emerald-600 transition-colors">
        <Wrench className="w-4 h-4" /> Internal Part ID
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="PART-CODE-789"
        className="font-mono bg-gray-50 focus:bg-white border-gray-100 transition-colors uppercase font-semibold"
      />
    </div>
  );
}

export function WarrantyPeriodInput({ value, onChange, required = false }) {
  const normalize = (v) => {
    if (!v) return { period: 0, unit: 'months' };
    if (typeof v === 'number') return { period: v, unit: 'months' };
    return v;
  };

  const val = normalize(value);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Warranty Coverage
      </Label>
      <div className="flex gap-2">
        <Input
          type="number"
          value={val.period}
          onChange={e => onChange({ ...val, period: parseInt(e.target.value) || 0 })}
          className="flex-1 font-bold"
        />
        <select
          value={val.unit}
          onChange={e => onChange({ ...val, unit: e.target.value })}
          className="bg-gray-50 border border-gray-100 rounded-lg px-2 text-sm font-bold text-gray-600"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
          <option value="years">Years</option>
        </select>
      </div>
    </div>
  );
}
