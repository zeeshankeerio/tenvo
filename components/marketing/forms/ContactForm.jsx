'use client';

import { useState, useRef, useEffect } from 'react';
import { validateForm } from '@/lib/marketing/validation';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';

/**
 * ContactForm Component
 * General contact form with spam protection and character counter
 */
export function ContactForm({ onSuccess, className = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    honeypot: '' // Spam protection field
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [messageLength, setMessageLength] = useState(0);

  const nameInputRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_MESSAGE_LENGTH = 1000;

  // Auto-focus on first field
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
    subject: [{ type: 'required', fieldName: 'Subject' }],
    message: [
      { type: 'required', fieldName: 'Message' },
      { type: 'minLength', value: 10, fieldName: 'Message' },
      { type: 'maxLength', value: MAX_MESSAGE_LENGTH, fieldName: 'Message' }
    ]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle message length
    if (name === 'message') {
      if (value.length <= MAX_MESSAGE_LENGTH) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setMessageLength(value.length);
        autoResizeTextarea();
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear submit status
    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage('');
    }
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Spam protection: if honeypot field is filled, reject silently
    if (formData.honeypot) {
      console.warn('Spam detected');
      setSubmitStatus('success');
      setSubmitMessage('Thank you for your message. We\'ll get back to you soon.');
      return;
    }

    // Validate form
    const validation = validateForm(formData, validationRules);

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErrorField = Object.keys(validation.errors)[0];
      document.getElementsByName(firstErrorField)[0]?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/marketing/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit contact form');
      }

      // Track successful submission
      trackEvent(EVENTS.CONTACT_FORM_SUBMIT, {
        subject: formData.subject
      });

      setSubmitStatus('success');
      setSubmitMessage('Thank you for contacting us! We\'ll respond within 24 hours.');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        honeypot: ''
      });
      setMessageLength(0);

      if (onSuccess) {
        onSuccess(data);
      }

    } catch (error) {
      console.error('Contact form submission error:', error);
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'Failed to submit form. Please try again.');

      trackEvent(EVENTS.FORM_ERROR, {
        form: 'contact',
        error: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`space-y-6 ${className}`}
      noValidate
    >
      {/* Honeypot field for spam protection - hidden from users */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="honeypot">Leave this field empty</label>
        <input
          type="text"
          id="honeypot"
          name="honeypot"
          value={formData.honeypot}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Name Field */}
      <div>
        <label 
          htmlFor="name" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameInputRef}
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="John Doe"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label 
          htmlFor="email" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="john@example.com"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div>
        <label 
          htmlFor="phone" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+92 300 1234567"
          aria-required="true"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Subject Field */}
      <div>
        <label 
          htmlFor="subject" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors ${
            errors.subject ? 'border-red-500' : 'border-gray-300'
          }`}
          aria-required="true"
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        >
          <option value="">Select a subject</option>
          <option value="general">General Inquiry</option>
          <option value="sales">Sales Question</option>
          <option value="support">Technical Support</option>
          <option value="billing">Billing Question</option>
          <option value="partnership">Partnership Opportunity</option>
          <option value="feedback">Feedback</option>
          <option value="other">Other</option>
        </select>
        {errors.subject && (
          <p id="subject-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.subject}
          </p>
        )}
      </div>

      {/* Message Field with Character Counter */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label 
            htmlFor="message" 
            className="block text-sm font-medium text-gray-700"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <span 
            className={`text-sm ${
              messageLength > MAX_MESSAGE_LENGTH * 0.9 
                ? 'text-red-600 font-medium' 
                : 'text-gray-500'
            }`}
            aria-live="polite"
          >
            {messageLength}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors resize-none ${
            errors.message ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Tell us how we can help you..."
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : 'message-hint'}
        />
        {errors.message ? (
          <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.message}
          </p>
        ) : (
          <p id="message-hint" className="mt-1 text-sm text-gray-500">
            Please provide as much detail as possible (minimum 10 characters)
          </p>
        )}
      </div>

      {/* Submit Status Messages */}
      {submitStatus === 'success' && (
        <div 
          className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
          role="alert"
          aria-live="polite"
        >
          <p className="font-medium">Success!</p>
          <p className="text-sm mt-1">{submitMessage}</p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div 
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{submitMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-4 emerald-600 text-white font-semibold rounded-lg hover:emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        We typically respond within 24 hours during business days.
      </p>
    </form>
  );
}
