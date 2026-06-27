'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  Upload, Link2, Sparkles, X, Check, Loader2,
  ImagePlus, RefreshCw, Trash2, ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

/**
 * ProductImageManager
 * 2026 best-practice image field for product forms.
 *
 * Features:
 *  1. Drag-and-drop / click upload  → uploads to /api/upload/product-image
 *  2. Paste / type a URL            → instant preview
 *  3. Auto-fetch from internet      → queries Unsplash by product name
 *  4. Live preview with remove
 *
 * Props:
 *  value       string  - current image_url
 *  onChange    fn      - called with new URL string
 *  productName string  - used for auto-fetch query
 *  category    string  - extra context for auto-fetch
 */
export function ProductImageManager({ value, onChange, productName = '', category = '', businessId = '' }) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'url' | 'auto'
  const [urlInput, setUrlInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const fileRef = useRef(null);

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const commit = useCallback(
    (url) => {
      setPreview(url);
      onChange(url);
    },
    [onChange]
  );

  // ── Upload handler ──────────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file) return;

    // Client-side validation
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowed.includes(file.type)) {
      toast.error('Unsupported format. Use JPEG, PNG, WebP or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5 MB.');
      return;
    }

    if (!businessId) {
      toast.error('Business context is required to upload images');
      return;
    }

    // Client-side resize + convert to WebP via Canvas before upload
    let processedFile = file;
    try {
      processedFile = await resizeToWebP(file, 800, 800, 0.82);
    } catch {
      // Canvas not available (SSR edge), use original
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', processedFile);
      if (businessId) {
        fd.append('businessId', businessId);
      }

      const res = await fetch('/api/upload/product-image', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      commit(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Canvas resize → WebP ────────────────────────────────────────────
  const resizeToWebP = (file, maxW, maxH, quality) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
            },
            'image/webp',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Drag & drop ─────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // ── URL paste ───────────────────────────────────────────────────────
  const applyUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\/.+/.test(u)) {
      toast.error('Please enter a valid https:// URL');
      return;
    }
    commit(u);
    setUrlInput('');
    toast.success('Image URL applied');
  };

  // ── Auto-fetch from Unsplash ─────────────────────────────────────────
  const autoFetch = async () => {
    const q = productName.trim();
    if (!q) {
      toast.error('Enter a product name first');
      return;
    }
    setFetching(true);
    try {
      const params = new URLSearchParams({ q, category });
      const res = await fetch(`/api/upload/product-image?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      commit(data.url);
      toast.success('Image fetched from internet');
    } catch (err) {
      toast.error(err.message || 'Could not fetch image');
    } finally {
      setFetching(false);
    }
  };

  const TABS = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'url',    label: 'URL',    icon: Link2 },
    { id: 'auto',   label: 'Auto',   icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      {/* ── Current preview ─────────────────────────────────────────── */}
      {preview ? (
        <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Product preview"
            className="w-full h-full object-cover"
            onError={() => setPreview('')}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => { commit(''); setPreview(''); }}
              className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-green-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm">
              <Check className="w-3 h-3" /> Image set
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-square max-w-[280px] mx-auto rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 bg-gray-50 text-gray-400">
          <ImagePlus className="w-10 h-10" />
          <p className="text-xs font-medium">No image yet</p>
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden p-0.5 gap-0.5 bg-gray-100">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Upload tab ─────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Uploading & optimising…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <Upload className={cn('w-8 h-8', dragging ? 'text-blue-400' : 'text-gray-300')} />
              <p className="text-sm font-semibold text-gray-700">
                {dragging ? 'Drop to upload' : 'Click or drag & drop'}
              </p>
              <p className="text-xs text-gray-400">
                JPEG · PNG · WebP · GIF, max 5 MB
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Auto-converted to WebP · resized to 800×800
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => uploadFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* ── URL tab ────────────────────────────────────────────────── */}
      {tab === 'url' && (
        <div className="space-y-3">
          <Label className="text-xs text-gray-500">Paste an image URL (https://...)</Label>
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/product.jpg"
              className="rounded-xl flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
            />
            <Button
              type="button"
              onClick={applyUrl}
              className="rounded-xl px-4"
              disabled={!urlInput.trim()}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
          {urlInput && /^https?:\/\/.+/.test(urlInput) && (
            <div className="rounded-xl overflow-hidden border border-gray-200 w-24 h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlInput} alt="URL preview" className="w-full h-full object-cover" onError={() => {}} />
            </div>
          )}
        </div>
      )}

      {/* ── Auto-fetch tab ─────────────────────────────────────────── */}
      {tab === 'auto' && (
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
            <p className="text-sm font-semibold text-purple-800 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Auto-fetch from internet
            </p>
            <p className="text-xs text-purple-600 mb-3">
              Finds a relevant image from Unsplash using your product name
              {productName ? <>, will search for <strong>"{productName}"</strong></> : ' (enter a product name first)'}
            </p>
            <Button
              type="button"
              onClick={autoFetch}
              disabled={fetching || !productName.trim()}
              className="w-full gap-2 rounded-xl"
            >
              {fetching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Fetching…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Fetch Image</>
              )}
            </Button>
          </div>
          {preview && (
            <Button
              type="button"
              variant="outline"
              onClick={autoFetch}
              disabled={fetching}
              className="w-full gap-2 rounded-xl text-xs"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', fetching && 'animate-spin')} />
              Try a different image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
