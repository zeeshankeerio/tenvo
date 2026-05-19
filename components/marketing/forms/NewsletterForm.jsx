'use client';

import { useState } from 'react';
import { validateEmail } from '@/lib/marketing/validation';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';

/**
 * NewsletterForm Component
 * Simple email subscription form for newsletter signup
 */
export function NewsletterForm({ variant = 'inline', className = '' }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
    
    // Clear error when user types
    if (error) {
      setError('');
    }
    
    // Clear submit status
    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/marketing/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to subscribe');
      }

      // Track successful subscription
      trackEvent(EVENTS.NEWSLETTER_SUBSCRIBE, {
        email: email
      });

      setSubmitStatus('success');
      setSubmitMessage('Thank you for subscribing! Check your email for confirmation.');
      setEmail('');

    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'Failed to subscribe. Please try again.');

      trackEvent(EVENTS.FORM_ERROR, {
        form: 'newsletter',
        error: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline variant (horizontal layout)
  if (variant === 'inline') {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-label="Email address"
              aria-invalid={!!error}
              aria-describedby={error ? 'newsletter-error' : undefined}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 emerald-600 text-white font-medium rounded-lg hover:emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>

          {error && (
            <p id="newsletter-error" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {submitStatus === 'success' && (
            <p className="text-sm text-green-600" role="alert" aria-live="polite">
              {submitMessage}
            </p>
          )}

          {submitStatus === 'error' && (
            <p className="text-sm text-red-600" role="alert" aria-live="assertive">
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    );
  }

  // Stacked variant (vertical layout)
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={handleChange}
            placeholder="Enter your email"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-label="Email address"
            aria-invalid={!!error}
            aria-describedby={error ? 'newsletter-error' : undefined}
          />
          {error && (
            <p id="newsletter-error" className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 emerald-600 text-white font-semibold rounded-lg hover:emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe to Newsletter'}
        </button>

        {submitStatus === 'success' && (
          <p className="text-sm text-green-600 text-center" role="alert" aria-live="polite">
            {submitMessage}
          </p>
        )}

        {submitStatus === 'error' && (
          <p className="text-sm text-red-600 text-center" role="alert" aria-live="assertive">
            {submitMessage}
          </p>
        )}
      </form>
    </div>
  );
}
