'use client';

import { useState } from 'react';
import { 
  Zap, 
  Settings, 
  ChevronRight, 
  AlertCircle, 
  Dna, 
  Stethoscope, 
  Hammer, 
  Palette 
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getDomainProductFields } from '@/lib/utils/domainHelpers';
import { Badge } from '@/components/ui/badge';

export function ExpertActionPanel({ category, item, onUpdate }) {
  const [open, setOpen] = useState(false);
  const fields = getDomainProductFields(category);
  
  // Custom icons based on domain
  const getDomainIcon = () => {
    if (category?.includes('pharmacy')) return <Stethoscope className="w-4 h-4" />;
    if (category?.includes('textile')) return <Palette className="w-4 h-4" />;
    if (category?.includes('auto')) return <Settings className="w-4 h-4" />;
    if (category?.includes('construction')) return <Hammer className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-wine hover:bg-wine/10 rounded-lg group transition-all"
          title="Expert Precision Entry"
        >
          {getDomainIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              {getDomainIcon()}
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Expert Precision Data</DialogTitle>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{category.replace(/-/g, ' ')} Module</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 space-y-4">
            {fields.length === 0 && (
              <p className="text-xs text-center text-gray-500 italic">No specialist fields required for this vertical.</p>
            )}
            {fields.map((field) => {
              const key = field.toLowerCase().replace(/[^a-z0-9]/g, '');
              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">{field}</Label>
                    <Badge variant="outline" className="text-[10px] h-4 border-gray-200 text-gray-400">Precision</Badge>
                  </div>
                  <Input
                    value={item[key] || ''}
                    onChange={(e) => onUpdate(key, e.target.value)}
                    className="h-10 rounded-xl font-bold border-gray-100 bg-white"
                    placeholder={`Enter ${field}...`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-brand-50/50 border border-brand-100/30">
            <AlertCircle className="w-4 h-4 text-brand-primary mt-0.5" />
            <p className="text-[10px] text-brand-primary-dark font-medium leading-relaxed">
              Precision data is automatically synced with domain-aware reporting. 
              Changes here are reflected in real-time in the {category.split('-')[0]} analytics engine.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={() => setOpen(false)}
            className="bg-brand-primary hover:opacity-90 text-white font-semibold px-8 h-10 rounded-xl shadow-lg"
          >
            Apply Precision Data
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
