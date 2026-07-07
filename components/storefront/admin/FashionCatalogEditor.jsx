'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FASHION_DEFAULT_TRUST_PILLARS } from '@/lib/storefront/fashionEditorial';

function uid() {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function ListEditor({ title, description, items = [], fields, onChange, createItem, max = 8 }) {
  const updateItem = (index, key, val) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: val } : item)));
  };

  const addItem = () => {
    if (items.length >= max) {
      toast.error(`Maximum ${max} items`);
      return;
    }
    onChange([...items, createItem()]);
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-xs text-gray-500">{description}</p> : null}
      </div>
      {items.map((item, index) => (
        <div key={item.id || index} className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-red-500" onClick={() => removeItem(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                <Label className="text-xs">{field.label}</Label>
                <Input
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(index, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

/**
 * Trust pillars, brands, and quick-search chips for clothing storefronts.
 */
export function FashionCatalogEditor({ fashion = {}, setFashion }) {
  const set = (key, val) => setFashion(key, val);

  const loadTrustDefaults = () => {
    set(
      'trustPillars',
      FASHION_DEFAULT_TRUST_PILLARS.map((pillar) => ({ ...pillar }))
    );
  };

  return (
    <div className="space-y-4">
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Trust, brands & search chips
      </p>

      <ListEditor
        title="Trust pillars"
        description="Shown below the hero. Leave empty to use default copy."
        items={fashion.trustPillars || []}
        fields={[
          { key: 'label', label: 'Label', placeholder: 'Premium fabrics' },
          { key: 'desc', label: 'Description', placeholder: 'Curated lawn and pret collections', full: true },
        ]}
        onChange={(v) => set('trustPillars', v)}
        createItem={() => ({ id: uid(), label: '', desc: '' })}
        max={6}
      />
      <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={loadTrustDefaults}>
        Load default trust pillars
      </Button>

      <ListEditor
        title="Trusted brands"
        description="Override auto-detected brands from product inventory."
        items={fashion.brands || []}
        fields={[{ key: 'name', label: 'Brand name', placeholder: 'Khaadi' }]}
        onChange={(v) =>
          set(
            'brands',
            v.map((row, i) => ({
              id: row.id || `brand-${i}`,
              name: row.name,
              slug: String(row.name || '')
                .toLowerCase()
                .replace(/\s+/g, '-'),
            }))
          )
        }
        createItem={() => ({ id: uid(), name: '', slug: '' })}
        max={12}
      />

      <div className="space-y-2 rounded-lg border p-3">
        <div>
          <p className="text-sm font-semibold">Quick search chips</p>
          <p className="text-xs text-gray-500">
            Header search shortcuts. Leave empty to derive from categories and featured products.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(fashion.quickSearchTerms || []).map((term, index) => (
            <div key={`${term}-${index}`} className="flex items-center gap-1">
              <Input
                value={term}
                onChange={(e) => {
                  const next = [...(fashion.quickSearchTerms || [])];
                  next[index] = e.target.value;
                  set('quickSearchTerms', next.filter(Boolean));
                }}
                className="h-8 w-32 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-red-500"
                onClick={() =>
                  set(
                    'quickSearchTerms',
                    (fashion.quickSearchTerms || []).filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={(fashion.quickSearchTerms || []).length >= 6}
          onClick={() => set('quickSearchTerms', [...(fashion.quickSearchTerms || []), ''])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add chip
        </Button>
      </div>
    </div>
  );
}
