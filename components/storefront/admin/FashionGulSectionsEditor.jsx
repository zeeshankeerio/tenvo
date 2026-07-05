'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDefaultFashionGulSections } from '@/lib/dataLab/fashionGulAhmedSections';
import { getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';

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
      fd.append('purpose', 'banner');
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function HomeEditTilesEditor({ tiles = [], onChange, businessId }) {
  const updateTile = (index, key, val) => {
    const next = tiles.map((t, i) => (i === index ? { ...t, [key]: val } : t));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {tiles.map((tile, index) => (
        <div key={tile.id || index} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tile {index + 1} · {tile.slot || 'custom'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Eyebrow</Label>
              <Input value={tile.eyebrow || ''} onChange={(e) => updateTile(index, 'eyebrow', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link (query or path)</Label>
              <Input value={tile.href || ''} onChange={(e) => updateTile(index, 'href', e.target.value)} placeholder="?category=bedding" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Headline (optional)</Label>
              <Input value={tile.title || ''} onChange={(e) => updateTile(index, 'title', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Banner image"
                value={tile.image || ''}
                onChange={(v) => updateTile(index, 'image', v)}
                businessId={businessId}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleTilesEditor({ columns = [], onChange, businessId }) {
  const flat = columns.flatMap((col) => col.tiles || []);
  const updateFlat = (flatIndex, key, val) => {
    let cursor = 0;
    const nextCols = columns.map((col) => ({
      ...col,
      tiles: (col.tiles || []).map((tile) => {
        const isTarget = cursor === flatIndex;
        cursor += 1;
        return isTarget ? { ...tile, [key]: val } : tile;
      }),
    }));
    onChange(nextCols);
  };

  return (
    <div className="space-y-4">
      {flat.map((tile, index) => (
        <div key={tile.id || index} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sale tile · {tile.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={tile.label || ''} onChange={(e) => updateFlat(index, 'label', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link</Label>
              <Input value={tile.href || ''} onChange={(e) => updateFlat(index, 'href', e.target.value)} placeholder="?category=kids&onSale=true" />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Desktop image"
                value={tile.desktop || tile.image || ''}
                onChange={(v) => updateFlat(index, 'desktop', v)}
                businessId={businessId}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Mobile image (optional)"
                value={tile.mobile || ''}
                onChange={(v) => updateFlat(index, 'mobile', v)}
                businessId={businessId}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Owner editor for Gul Ahmed–style Home Edit + Sale mosaic homepage blocks.
 */
export function FashionGulSectionsEditor({ fashion = {}, setFashion, businessCategory, businessId }) {
  const variant = getLuxuryFashionVariant(businessCategory) || 'boutique';
  const defaults = getDefaultFashionGulSections(variant);
  const homeEdit = fashion.homeEdit?.tiles?.length ? fashion.homeEdit : defaults.homeEdit;
  const saleMosaic = fashion.saleMosaic?.columns?.length ? fashion.saleMosaic : defaults.saleMosaic;

  const resetHomeEdit = () => {
    setFashion('homeEdit', { ...defaults.homeEdit });
    toast.success('Home Edit reset to defaults');
  };

  const resetSaleMosaic = () => {
    setFashion('saleMosaic', { ...defaults.saleMosaic });
    toast.success('Sale mosaic reset to defaults');
  };

  return (
    <>
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">The Home Edit</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Section title</Label>
          <Input
            value={fashion.homeEditTitle || ''}
            onChange={(e) => setFashion('homeEditTitle', e.target.value)}
            placeholder={defaults.homeEdit.title}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Subtitle</Label>
          <Textarea
            value={fashion.homeEditSubtitle || ''}
            onChange={(e) => setFashion('homeEditSubtitle', e.target.value)}
            placeholder={defaults.homeEdit.subtitle}
            rows={2}
          />
        </div>
      </div>
      <HomeEditTilesEditor
        tiles={homeEdit.tiles}
        businessId={businessId}
        onChange={(tiles) => setFashion('homeEdit', { ...homeEdit, tiles })}
      />
      <Button type="button" variant="outline" size="sm" onClick={resetHomeEdit}>
        Reset Home Edit to defaults
      </Button>

      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sale mosaic</p>
      <div className="space-y-1.5">
        <Label>Section title</Label>
        <Input
          value={fashion.saleMosaicTitle || ''}
          onChange={(e) => setFashion('saleMosaicTitle', e.target.value)}
          placeholder={defaults.saleMosaic.title}
        />
      </div>
      <SaleTilesEditor
        columns={saleMosaic.columns}
        businessId={businessId}
        onChange={(columns) => setFashion('saleMosaic', { ...saleMosaic, columns })}
      />
      <Button type="button" variant="outline" size="sm" onClick={resetSaleMosaic}>
        Reset Sale mosaic to defaults
      </Button>
    </>
  );
}
