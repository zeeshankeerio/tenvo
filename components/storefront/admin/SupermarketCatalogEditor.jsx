'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

function ImageUploadField({ value, onChange, businessId, label = 'Image' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!businessId) {
      toast.error('Business context required to upload');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('businessId', businessId);
      const res = await fetch('/api/upload/product-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        onChange(data.url);
        toast.success('Image uploaded');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1 h-3.5 w-3.5" />
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onChange('')}>
            Remove
          </Button>
        ) : null}
      </div>
      {value ? (
        <div className="h-20 overflow-hidden rounded-lg border bg-gray-50">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Or paste image URL" className="text-xs" />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function CatalogListEditor({
  title,
  description,
  items = [],
  fields,
  onChange,
  businessId,
  createItem,
  max = 12,
}) {
  const updateItem = (index, patch) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
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
            {fields.map((field) => {
              if (field.type === 'image') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <ImageUploadField
                      value={item[field.key]}
                      onChange={(v) => updateItem(index, { [field.key]: v })}
                      businessId={businessId}
                      label={field.label}
                    />
                  </div>
                );
              }
              if (field.type === 'select') {
                return (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={item[field.key] || field.defaultValue || ''}
                      onChange={(e) => updateItem(index, { [field.key]: e.target.value })}
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={item[field.key] || ''}
                    onChange={(e) => updateItem(index, { [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add item
      </Button>
    </div>
  );
}

const CATEGORY_FIELDS = [
  { key: 'label', label: 'Label', placeholder: 'Groceries & Pets' },
  { key: 'slug', label: 'Category slug', placeholder: 'grocery' },
  { key: 'hrefSuffix', label: 'Link suffix (optional)', placeholder: '?onSale=true' },
  { key: 'image', label: 'Image', type: 'image' },
];

const BRAND_FIELDS = [
  { key: 'label', label: 'Brand name', placeholder: 'Unilever' },
  { key: 'hrefSuffix', label: 'Link', placeholder: '?search=unilever' },
  { key: 'image', label: 'Logo', type: 'image' },
];

const TILE_FIELDS = [
  { key: 'title', label: 'Title', placeholder: 'Skin care' },
  { key: 'subtitle', label: 'Subtitle', placeholder: 'Optional' },
  { key: 'href', label: 'Link', placeholder: '?category=skin-care' },
  { key: 'image', label: 'Banner image', type: 'image' },
];

const RAIL_FIELDS = [
  { key: 'title', label: 'Section title', placeholder: 'Mega Food Offer' },
  { key: 'subtitle', label: 'Subtitle', placeholder: 'Bundle savings' },
  { key: 'href', label: 'View all link', placeholder: '?onSale=true' },
  {
    key: 'partition',
    label: 'Product pool',
    type: 'select',
    defaultValue: 'deals',
    options: [
      { value: 'deals', label: 'Deals / on sale' },
      { value: 'fresh', label: 'Fresh / newest' },
      { value: 'topSellers', label: 'Top sellers / featured' },
    ],
  },
];

const TRUST_FIELDS = [
  { key: 'label', label: 'Title', placeholder: 'Free Shipping' },
  { key: 'desc', label: 'Description', placeholder: 'On qualifying orders' },
];

const SUBNAV_FIELDS = [
  { key: 'label', label: 'Label', placeholder: 'Beauty' },
  { key: 'slug', label: 'Category slug', placeholder: 'personal-care' },
  { key: 'hrefSuffix', label: 'Link suffix', placeholder: '?search=fragrance' },
];

const uid = () => `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Full supermarket homepage catalog editor for store owners.
 */
export function SupermarketCatalogEditor({ supermarket = {}, businessId, onChange }) {
  const set = (key, val) => onChange({ ...supermarket, [key]: val });
  const setTitle = (key, val) =>
    onChange({
      ...supermarket,
      sectionTitles: { ...(supermarket.sectionTitles || {}), [key]: val },
    });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['showAisleCarousel', 'Popular categories'],
          ['showUpperPromoTiles', 'Upper promo banners'],
          ['showBrandsRow', 'Trending brands row'],
          ['brandsAutoScroll', 'Auto-scroll trending brands'],
          ['showMidPromoTiles', 'Mid-page banner row'],
          ['showPromoBanners', 'Shop-by-offer tiles'],
          ['showHomeRails', 'Product carousel sections'],
          ['homeRailsAutoScroll', 'Auto-scroll product carousels'],
          ['showTrustStrip', 'Homepage trust strip'],
          ['showFooterTrustStrip', 'Footer trust bar'],
          ['showDeliveryBanner', 'Free delivery banner'],
          ['showWeeklyEssentials', 'Weekly essentials CTA', true],
        ].map(([key, label, optIn]) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              checked={optIn ? supermarket[key] === true : supermarket[key] !== false}
              onCheckedChange={(v) => set(key, v)}
            />
            <Label className="text-sm">{label}</Label>
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Top promo / delivery notice</Label>
          <Textarea
            value={supermarket.deliveryNotice || ''}
            onChange={(e) => set('deliveryNotice', e.target.value)}
            rows={2}
            placeholder="Delivery timings are from 10:00 AM to 9:00 PM…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Promo strip link label</Label>
          <Input value={supermarket.promoStripLabel || ''} onChange={(e) => set('promoStripLabel', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Promo strip link path</Label>
          <Input value={supermarket.promoStripHref || ''} onChange={(e) => set('promoStripHref', e.target.value)} placeholder="/products" />
        </div>
        <div className="space-y-1.5">
          <Label>Search placeholder</Label>
          <Input value={supermarket.searchPlaceholder || ''} onChange={(e) => set('searchPlaceholder', e.target.value)} />
        </div>
      </div>

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Section titles</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['popularCategories', 'Popular categories'],
          ['trendingNow', 'Trending now'],
          ['shopByOffer', 'Shop by offer'],
          ['deliveryBanner', 'Delivery banner'],
          ['weeklyEssentials', 'Weekly essentials'],
        ].map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input
              value={supermarket.sectionTitles?.[key] || ''}
              onChange={(e) => setTitle(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <CatalogListEditor
        title="Popular categories"
        description="Square tiles below the hero. Use slug or hrefSuffix for links."
        items={supermarket.categoryIcons || []}
        fields={CATEGORY_FIELDS}
        businessId={businessId}
        onChange={(v) => set('categoryIcons', v)}
        createItem={() => ({ id: uid(), label: '', slug: '', image: '' })}
        max={10}
      />

      <CatalogListEditor
        title="Trending brands"
        description="Circular brand logos in the trending row."
        items={supermarket.brands || []}
        fields={BRAND_FIELDS}
        businessId={businessId}
        onChange={(v) => set('brands', v)}
        createItem={() => ({ id: uid(), label: '', hrefSuffix: '', image: '' })}
        max={14}
      />

      <CatalogListEditor
        title="Upper promo banners"
        description="Wide tiles directly under categories."
        items={supermarket.upperPromoTiles || []}
        fields={TILE_FIELDS}
        businessId={businessId}
        onChange={(v) => set('upperPromoTiles', v)}
        createItem={() => ({ id: uid(), title: '', href: '?onSale=true', image: '' })}
        max={6}
      />

      <CatalogListEditor
        title="Mid-page banners"
        description="Inserted between product carousels."
        items={supermarket.midPromoTiles || []}
        fields={TILE_FIELDS}
        businessId={businessId}
        onChange={(v) => set('midPromoTiles', v)}
        createItem={() => ({ id: uid(), title: '', href: '?onSale=true', image: '' })}
        max={4}
      />

      <CatalogListEditor
        title="Shop-by-offer tiles"
        description="Larger promotional category cards."
        items={supermarket.promoTiles || []}
        fields={TILE_FIELDS}
        businessId={businessId}
        onChange={(v) => set('promoTiles', v)}
        createItem={() => ({ id: uid(), title: '', subtitle: '', href: '?onSale=true', image: '' })}
        max={8}
      />

      <CatalogListEditor
        title="Product carousel sections"
        description="Each row pulls from live inventory by pool type."
        items={supermarket.homeRails || []}
        fields={RAIL_FIELDS}
        businessId={businessId}
        onChange={(v) => set('homeRails', v)}
        createItem={() => ({ id: uid(), title: '', subtitle: '', href: '?onSale=true', partition: 'deals', enabled: true })}
        max={10}
      />

      <CatalogListEditor
        title="Homepage trust strip"
        items={supermarket.trustPillars || []}
        fields={TRUST_FIELDS}
        businessId={businessId}
        onChange={(v) => set('trustPillars', v)}
        createItem={() => ({ id: uid(), label: '', desc: '' })}
        max={6}
      />

      <CatalogListEditor
        title="Footer trust bar"
        items={supermarket.footerTrustPillars || []}
        fields={TRUST_FIELDS}
        businessId={businessId}
        onChange={(v) => set('footerTrustPillars', v)}
        createItem={() => ({ id: uid(), label: '', desc: '', icon: 'truck' })}
        max={4}
      />

      <CatalogListEditor
        title="Header sub-navigation"
        description="Quick category links under the search bar."
        items={supermarket.subNavLinks || []}
        fields={SUBNAV_FIELDS}
        businessId={businessId}
        onChange={(v) => set('subNavLinks', v)}
        createItem={() => ({ id: uid(), label: '', slug: '' })}
        max={10}
      />
    </div>
  );
}
