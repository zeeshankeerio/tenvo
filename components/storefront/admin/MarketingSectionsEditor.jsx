'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND_PRIMARY } from '@/lib/theme/brandTokens';
import {
  createEmptyPageSection,
  MAX_PAGE_SECTIONS,
  getSectionBackgroundStyle,
} from '@/lib/storefront/storePageSections';
import { ChevronDown, ChevronUp, Image, Megaphone, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

const CTA_PRESETS = [
  { label: 'All products', value: '/products' },
  { label: 'On sale', value: '/products?onSale=true' },
  { label: 'Contact', value: '/contact' },
];

function SectionImageUpload({ value, onChange, businessId }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!businessId) {
      toast.error('Business context is required to upload images');
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
        toast.success('Banner image uploaded');
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? 'Uploading…' : 'Upload banner'}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onChange('')}>
            Remove image
          </Button>
        ) : null}
      </div>
      {value ? (
        <div className="h-28 overflow-hidden rounded-xl border bg-gray-50">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/**
 * @param {{ sections: object[]; brandColor?: string; businessId?: string; onChange: (sections: object[]) => void }} props
 */
export function MarketingSectionsEditor({ sections = [], brandColor, businessId, onChange }) {
  const accent = brandColor || BRAND_PRIMARY;

  const updateSection = (id, patch) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const moveSection = (index, direction) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const addSection = (type) => {
    if (sections.length >= MAX_PAGE_SECTIONS) {
      toast.error(`Maximum ${MAX_PAGE_SECTIONS} sections`);
      return;
    }
    const section = createEmptyPageSection(type);
    section.sortOrder = sections.length;
    section.gradientFrom = accent;
    section.gradientTo = '#1e3a8a';
    section.backgroundColor = accent;
    onChange([...sections, section]);
  };

  const removeSection = (id) => onChange(sections.filter((s) => s.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Add up to {MAX_PAGE_SECTIONS} blocks. Upload a photo or design with brand gradients.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addSection('banner')}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Banner
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addSection('promo-strip')}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Promo strip
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No marketing sections yet. Add a banner for seasonal sales or a promo strip for announcements.
        </div>
      ) : null}

      {sections.map((section, index) => {
        const previewStyle = getSectionBackgroundStyle(section, accent);
        return (
          <Card key={section.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  {section.type === 'promo-strip' ? (
                    <Megaphone className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Image className="h-4 w-4 text-blue-600" />
                  )}
                  {section.type === 'promo-strip' ? 'Promo strip' : 'Marketing banner'} #{index + 1}
                </CardTitle>
                <CardDescription>Shown on your public homepage in this order</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={section.enabled !== false}
                  onCheckedChange={(v) => updateSection(section.id, { enabled: v })}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeSection(section.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="rounded-xl px-4 py-6 text-center sm:px-6 sm:py-8"
                style={{ ...previewStyle, color: section.textColor || '#fff' }}
              >
                <p className="text-lg font-bold">{section.title || 'Headline preview'}</p>
                {section.subtitle ? <p className="mt-1 text-sm opacity-90">{section.subtitle}</p> : null}
                {section.ctaLabel ? (
                  <span className="mt-3 inline-block rounded-lg bg-white/95 px-3 py-1 text-xs font-bold text-slate-900">
                    {section.ctaLabel}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Headline</Label>
                  <Input value={section.title || ''} onChange={(e) => updateSection(section.id, { title: e.target.value })} placeholder="Summer sale, 20% off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Button label</Label>
                  <Input value={section.ctaLabel || ''} onChange={(e) => updateSection(section.id, { ctaLabel: e.target.value })} placeholder="Shop now" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subtext</Label>
                <Textarea rows={2} value={section.subtitle || ''} onChange={(e) => updateSection(section.id, { subtitle: e.target.value })} placeholder="Optional supporting line" />
              </div>

              {section.type === 'banner' ? (
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                  <Label>Design style</Label>
                  <div className="flex flex-wrap gap-2">
                    {['gradient', 'solid', 'image'].map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={section.design === mode ? 'default' : 'outline'}
                        onClick={() => updateSection(section.id, { design: mode })}
                      >
                        {mode === 'gradient' ? 'Brand gradient' : mode === 'solid' ? 'Solid color' : 'Photo upload'}
                      </Button>
                    ))}
                  </div>
                  {section.design === 'image' ? (
                    <SectionImageUpload
                      value={section.imageUrl || ''}
                      onChange={(v) => updateSection(section.id, { imageUrl: v })}
                      businessId={businessId}
                    />
                  ) : section.design === 'gradient' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Gradient start</Label>
                        <Input type="color" value={section.gradientFrom || accent} onChange={(e) => updateSection(section.id, { gradientFrom: e.target.value })} className="h-10 w-full" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Gradient end</Label>
                        <Input type="color" value={section.gradientTo || '#1e3a8a'} onChange={(e) => updateSection(section.id, { gradientTo: e.target.value })} className="h-10 w-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Background color</Label>
                      <Input type="color" value={section.backgroundColor || accent} onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })} className="h-10 w-full" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Text color</Label>
                    <Input type="color" value={section.textColor || '#ffffff'} onChange={(e) => updateSection(section.id, { textColor: e.target.value })} className="h-10 w-32" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Strip background</Label>
                  <Input type="color" value={section.backgroundColor || accent} onChange={(e) => updateSection(section.id, { backgroundColor: e.target.value })} className="h-10 w-32" />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Link target</Label>
                  <select
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    value={CTA_PRESETS.some((p) => p.value === section.ctaHref) ? section.ctaHref : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') updateSection(section.id, { ctaHref: e.target.value });
                    }}
                  >
                    {CTA_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                    <option value="custom">Custom path or URL</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Custom link</Label>
                  <Input
                    value={section.ctaHref || ''}
                    onChange={(e) => updateSection(section.id, { ctaHref: e.target.value })}
                    placeholder="/products or https://…"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
