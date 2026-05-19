'use client';

import { useState, useRef, useEffect } from 'react';
import { validateForm } from '@/lib/marketing/validation';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';

/**
 * DemoRequestForm Component
 * Form for requesting a product demo with validation and submission handling
 */
export function DemoRequestForm({ onSuccess, className = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    message: '',
    preferredDate: '',
    preferredTime: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');

  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const validationRules = {
    name: [
      { type: 'required', fieldName: 'Name' },
      { type: 'minLength', value: 2, fieldName: 'Name' }
    ],
    email: [{ type: 'email' }],
    phone: [{ type: 'phone' }],
    company: [{ type: 'required', fieldName: 'Company' }],
    industry: [{ type: 'required', fieldName: 'Industry' }]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (submitStatus) { setSubmitStatus(null); setSubmitMessage(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(formData, validationRules);
    if (!validation.isValid) {
      setErrors(validation.errors);
      document.getElementsByName(Object.keys(validation.errors)[0])[0]?.focus();
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await fetch('/api/marketing/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit demo request');
      trackEvent(EVENTS.DEMO_REQUEST_SUBMIT, { industry: formData.industry, company: formData.company });
      setSubmitStatus('success');
      setSubmitMessage("Thank you! Your demo request has been received. We'll contact you within 24 hours.");
      setFormData({ name: '', email: '', phone: '', company: '', industry: '', message: '', preferredDate: '', preferredTime: '' });
      if (onSuccess) onSuccess(data);
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'Failed to submit demo request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`} noValidate>
      <div>
        <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameInputRef}
          type="text" id="demo-name" name="name" value={formData.name} onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="John Doe" aria-required="true" aria-invalid={!!errors.name}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600" role="alert">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email" id="demo-email" name="email" value={formData.email} onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="john@company.com" aria-required="true" aria-invalid={!!errors.email}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600" role="alert">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel" id="demo-phone" name="phone" value={formData.phone} onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="+92 300 1234567" aria-required="true" aria-invalid={!!errors.phone}
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600" role="alert">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="demo-company" className="block text-sm font-medium text-gray-700 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text" id="demo-company" name="company" value={formData.company} onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${errors.company ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Your Company" aria-required="true" aria-invalid={!!errors.company}
        />
        {errors.company && <p className="mt-1 text-sm text-red-600" role="alert">{errors.company}</p>}
      </div>

      <div>
        <label htmlFor="demo-industry" className="block text-sm font-medium text-gray-700 mb-2">
          Industry <span className="text-red-500">*</span>
        </label>
        <select
          id="demo-industry" name="industry" value={formData.industry} onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${errors.industry ? 'border-red-500' : 'border-gray-300'}`}
          aria-required="true" aria-invalid={!!errors.industry}
        >
          <option value="">Select your industry</option>
          <option value="retail">Retail & E-commerce</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="wholesale">Wholesale & Distribution</option>
          <option value="healthcare">Healthcare</option>
          <option value="hospitality">Hospitality & Food Service</option>
          <option value="construction">Construction</option>
          <option value="automotive">Automotive</option>
          <option value="textile">Textile & Apparel</option>
          <option value="electronics">Electronics</option>
          <option value="pharmaceutical">Pharmaceutical</option>
          <option value="other">Other</option>
        </select>
        {errors.industry && <p className="mt-1 text-sm text-red-600" role="alert">{errors.industry}</p>}
      </div>

      <div>
        <label htmlFor="demo-message" className="block text-sm font-medium text-gray-700 mb-2">
          Message (Optional)
        </label>
        <textarea
          id="demo-message" name="message" value={formData.message} onChange={handleChange}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors resize-none"
          placeholder="Tell us about your requirements..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="demo-date" className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Date (Optional)
          </label>
          <input
            type="date" id="demo-date" name="preferredDate" value={formData.preferredDate} onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
          />
        </div>
        <div>
          <label htmlFor="demo-time" className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Time (Optional)
          </label>
          <select
            id="demo-time" name="preferredTime" value={formData.preferredTime} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
          >
            <option value="">Select time</option>
            <option value="morning">Morning (9 AM - 12 PM)</option>
            <option value="afternoon">Afternoon (12 PM - 3 PM)</option>
            <option value="evening">Evening (3 PM - 6 PM)</option>
          </select>
        </div>
      </div>

      {submitStatus === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800" role="alert" aria-live="polite">
          <p className="font-medium">Success!</p>
          <p className="text-sm mt-1">{submitMessage}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert" aria-live="assertive">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{submitMessage}</p>
        </div>
      )}

      <button
        type="submit" disabled={isSubmitting}
        className="w-full px-6 py-4 emerald-600 text-white font-semibold rounded-lg hover:emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Request Demo'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        By submitting this form, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
