'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildDefaultFashionPromoBannerSeed,
  getFashionPromoBannerCopy,
} from '@/lib/storefront/fashionPromoBanners';

function BannerImageUpload({ value, onChange, businessId }) {
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
      fd.append('purpose', 'banner');
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
    <div className="space-y-1.5">
      <Label className="text-xs">Banner image</Label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1 h-3.5 w-3.5" />
          {uploading ? 'Uploading…' : 'Upload image'}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => onChange('')}>
            Use inventory default
          </Button>
        ) : null}
      </div>
      {value ? (
        <div className="h-24 overflow-hidden rounded-lg border bg-gray-50">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <p className="text-xs text-gray-400">Leave empty to auto-pick from matching inventory photos.</p>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/**
 * Owner editor for fashion promo split banners (Ready to wear / Unstitched, etc.).
 */
export function FashionPromoBannersEditor({ fashion = {}, setFashion, businessCategory, businessId }) {
  const copy = getFashionPromoBannerCopy(businessCategory);
  const stored = Array.isArray(fashion.promoBanners) ? fashion.promoBanners : [];
  const banners =
    stored.length >= copy.length
      ? stored
      : copy.map((seed, index) => ({ ...seed, ...(stored[index] || {}) }));

  const updateBanner = (index, key, value) => {
    const next = banners.map((b, i) => (i === index ? { ...b, [key]: value } : b));
    setFashion('promoBanners', next);
  };

  const resetBanners = () => {
    setFashion('promoBanners', buildDefaultFashionPromoBannerSeed(businessCategory, [], null));
  };

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Promo banner row</p>
        <Button type="button" variant="outline" size="sm" onClick={resetBanners}>
          Reset to defaults
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Two homepage promo tiles. Images default from matching inventory (pret vs unstitched). Upload to override.
      </p>
      {banners.map((banner, index) => (
        <div key={banner.id || index} className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Banner {index + 1}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={banner.title || ''} onChange={(e) => updateBanner(index, 'title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link suffix</Label>
              <Input
                value={banner.href || ''}
                onChange={(e) => updateBanner(index, 'href', e.target.value)}
                placeholder="?search=unstitched"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Subtitle</Label>
              <Input value={banner.subtitle || ''} onChange={(e) => updateBanner(index, 'subtitle', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                value={banner.tone || 'dark'}
                onChange={(e) => updateBanner(index, 'tone', e.target.value)}
              >
                <option value="dark">Dark overlay (white text)</option>
                <option value="light">Light overlay (dark text)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <BannerImageUpload
                value={banner.image || ''}
                onChange={(url) => updateBanner(index, 'image', url)}
                businessId={businessId}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
