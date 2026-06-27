'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { AlertCircle, Flame, Biohazard, Radiation, ShieldAlert, Pill, Car, Microscope, HelpCircle, Book, Hash } from 'lucide-react';
import { getFieldLabel, getFieldInputType, isFieldRequired, getDomainKnowledge, normalizeKey, getSelectOptions, getDomainUnitPreview } from '@/lib/utils/domainHelpers';
import { VehicleCompatibilitySelector, OEMNumberInput, PartNumberInput, WarrantyPeriodInput } from './AutoPartsFields';
import { SerialNumberInput } from './SerialTracking';
import { BatchNumberInput } from './BatchTracking';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DomainFieldRenderer({
  field,
  value,
  onChange,
  category,
  product = {},
  className = '',
  error = null, // Accept error prop
}) {
  const label = getFieldLabel(field, category);
  const inputType = getFieldInputType(field, category);
  const required = isFieldRequired(field, category);
  const unitPreview = getDomainUnitPreview(field, category);

  // Icon mapping for domain fields
  const getFieldIcon = () => {
    const n = normalizeKey(field);
    if (n.includes('drug') || n.includes('license') || n.includes('pharmacy')) return <Pill className="w-3.5 h-3.5" />;
    if (n.includes('vehicle') || n.includes('car') || n.includes('truck')) return <Car className="w-3.5 h-3.5" />;
    if (n.includes('hazardous') || n.includes('toxic') || n.includes('danger')) return <Biohazard className="w-3.5 h-3.5" />;
    if (n.includes('radiation') || n.includes('atomic')) return <Radiation className="w-3.5 h-3.5" />;
    if (n.includes('flammable') || n.includes('fire')) return <Flame className="w-3.5 h-3.5" />;
    if (n.includes('isbn') || n.includes('book') || n.includes('author')) return <Book className="w-3.5 h-3.5" />;
    if (n.includes('model') || n.includes('serial')) return <Hash className="w-3.5 h-3.5" />;
    if (n.includes('compliance') || n.includes('legal')) return <ShieldAlert className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5 text-gray-300" />;
  };

  // 4. Default Field Rendering
  const renderField = () => {
    switch (inputType) {
      case 'date':
        return <DatePicker value={value || ''} onChange={onChange} />;
      case 'number':
        return (
          <div className="relative">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              required={required}
              className={cn(
                "font-bold border-gray-100 bg-gray-50/30 focus:bg-white transition-all pl-3",
                error ? "border-red-400 bg-red-50/50 focus:ring-red-200" : "hover:border-indigo-100 focus:border-indigo-400",
                required && !value && !error && "border-amber-100 bg-amber-50/20"
              )}
            />
            {unitPreview && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-gray-400 cursor-help hover:text-gray-600 transition-colors">
                      {unitPreview}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold">Standard {category.replace(/-/g, ' ')} unit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2 p-3 bg-gray-50/50 rounded-lg border border-transparent hover:border-blue-100 transition-all">
            <Checkbox checked={!!value} onCheckedChange={(checked) => onChange(checked)} />
            <Label className="font-medium cursor-pointer flex items-center gap-2">
              {getFieldIcon()}
              {label}
            </Label>
          </div>
        );
      case 'select':
        return <DomainSelect field={field} category={category} value={value} onChange={onChange} error={error} />;
      case 'vehicle-compatibility':
        return <VehicleCompatibilitySelector value={value || []} onChange={onChange} />;
      case 'oem-number':
        return <OEMNumberInput value={value} onChange={onChange} required={required} />;
      case 'part-number':
        return <PartNumberInput value={value} onChange={onChange} required={required} />;
      case 'warranty':
        return <WarrantyPeriodInput value={value} onChange={onChange} required={required} />;
      default:
        return (
          <div className="relative">
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              placeholder={`Enter ${label.toLowerCase()}`}
              className={cn(
                "border-gray-100 bg-gray-50/30 focus:bg-white transition-all pl-3",
                error ? "border-red-400 bg-red-50/50 focus:ring-red-200" : "hover:border-indigo-100 focus:border-indigo-400",
                required && !value && !error && "border-amber-100 bg-amber-50/20"
              )}
            />
            {unitPreview && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-gray-400 cursor-help hover:text-gray-600 transition-colors">
                      {unitPreview}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold">Standard {category.replace(/-/g, ' ')} unit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
    }
  };

  if (inputType === 'checkbox') return <div className={className}>{renderField()}{error && <p className="text-[10px] font-bold text-red-500 mt-1">{error}</p>}</div>;

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${error ? 'text-red-500' : 'text-gray-400'}`}>
        {getFieldIcon()}
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {error && (
        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-tight flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function DomainSelect({ field, category, value, onChange, error }) {
  const rawOptions = getSelectOptions(field, category);

  if (!rawOptions || rawOptions.length === 0) {
    return <Input value={value || ''} onChange={e => onChange(e.target.value)} className={error ? "border-red-500 bg-red-50" : ""} />;
  }

  // Normalize options to { value, label } format and filter out empty values
  const options = rawOptions
    .map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
    .filter(opt => opt.value && opt.value.toString().trim() !== '');

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`h-11 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all ${error ? "border-red-500 bg-red-50 focus:ring-red-500" : ""}`}>
        <SelectValue placeholder="Select option..." />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


