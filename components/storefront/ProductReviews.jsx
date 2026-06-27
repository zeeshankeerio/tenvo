'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, MessageCircle, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

function StarRating({ value, onChange, size = 'md', readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={cn('transition-transform', !readOnly && 'hover:scale-110 cursor-pointer')}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              sizes[size],
              (hovered || value) >= star
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-200 fill-gray-200'
            )}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 text-right text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-gray-400 text-xs flex-shrink-0">{pct}%</span>
    </div>
  );
}

export function ProductReviews({ productId, businessDomain, initialRating, reviewCount }) {
  const { settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(reviewCount || 0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Rating distribution (computed from fetched reviews)
  const [distribution, setDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

  const [form, setForm] = useState({
    reviewerName: '',
    reviewerEmail: '',
    rating: 0,
    title: '',
    body: '',
  });

  const fetchReviews = useCallback(async (p = 1) => {
    if (!productId || !businessDomain) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/storefront/${businessDomain}/products/${productId}/reviews?page=${p}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (p === 1) {
        setReviews(data.reviews || []);
        // Compute distribution
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        (data.reviews || []).forEach((r) => {
          if (dist[r.rating] !== undefined) dist[r.rating]++;
        });
        setDistribution(dist);
      } else {
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
      }
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch {
      // Silently fail, reviews are non-critical
    } finally {
      setLoading(false);
    }
  }, [productId, businessDomain]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    if (!form.reviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/storefront/${businessDomain}/products/${productId}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setSubmitted(true);
      setShowForm(false);
      toast.success('Review submitted! It will appear after moderation.');
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = initialRating || (reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-black text-gray-900 mb-6">Customer Reviews</h2>

        {/* ── Rating Summary ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-8 mb-8 p-6 bg-gray-50 rounded-2xl">
          {/* Average score */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-black text-gray-900 leading-none">
              {avgRating > 0 ? avgRating.toFixed(1) : ', '}
            </div>
            <StarRating value={Math.round(avgRating)} readOnly size="sm" />
            <p className="text-sm text-gray-500 mt-1">
              {total} {total === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Distribution bars */}
          {total > 0 && (
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <RatingBar
                  key={star}
                  label={`${star}★`}
                  count={distribution[star] || 0}
                  total={reviews.length}
                />
              ))}
            </div>
          )}

          {/* Write review CTA */}
          <div className="flex-shrink-0 flex items-center">
            {submitted ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                Review submitted!
              </div>
            ) : (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: accent }}
              >
                <MessageCircle className="w-4 h-4" />
                Write a Review
              </button>
            )}
          </div>
        </div>

        {/* ── Review Form ─────────────────────────────────────────────── */}
        {showForm && (
          <Card className="mb-8 border-2" style={{ borderColor: accent + '30' }}>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Share Your Experience</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star rating */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Your Rating <span className="text-red-500">*</span>
                  </Label>
                  <StarRating
                    value={form.rating}
                    onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                    size="lg"
                  />
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reviewerName" className="text-sm font-semibold mb-1.5 block">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="reviewerName"
                      placeholder="Your name"
                      value={form.reviewerName}
                      onChange={(e) => setForm((f) => ({ ...f, reviewerName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reviewerEmail" className="text-sm font-semibold mb-1.5 block">
                      Email <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="reviewerEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={form.reviewerEmail}
                      onChange={(e) => setForm((f) => ({ ...f, reviewerEmail: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="reviewTitle" className="text-sm font-semibold mb-1.5 block">
                    Review Title
                  </Label>
                  <Input
                    id="reviewTitle"
                    placeholder="Summarize your experience"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Body */}
                <div>
                  <Label htmlFor="reviewBody" className="text-sm font-semibold mb-1.5 block">
                    Review
                  </Label>
                  <Textarea
                    id="reviewBody"
                    placeholder="Tell others what you think about this product..."
                    rows={4}
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                    style={{ backgroundColor: accent }}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    ) : (
                      'Submit Review'
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Reviews List ────────────────────────────────────────────── */}
        {loading && reviews.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reviews yet</p>
            <p className="text-xs mt-1">Be the first to review this product</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  {review.reviewer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{review.reviewer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={review.rating} readOnly size="sm" />
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    {review.helpful_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {review.helpful_count} helpful
                      </span>
                    )}
                  </div>

                  {review.title && (
                    <p className="font-semibold text-sm text-gray-900 mt-2">{review.title}</p>
                  )}
                  {review.body && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.body}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchReviews(next);
                  }}
                  disabled={loading}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load More Reviews'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
