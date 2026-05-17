/**
 * Analytics Tracking Utilities
 * Google Analytics 4 and Meta Pixel integration
 * Following 2026 best practices for privacy-first analytics
 */

// Google Analytics 4 Measurement ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Track page view
 * @param {string} url - Page URL
 */
export const trackPageView = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Track custom event
 * @param {string} eventName - Event name
 * @param {Object} eventData - Event data
 */
export const trackEvent = (eventName, eventData = {}) => {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }
  
  // Meta Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventData);
  }
  
  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[CHART] Track Event:', eventName, eventData);
  }
};

/**
 * Predefined event types
 */
export const EVENTS = {
  // Page events
  PAGE_VIEW: 'page_view',
  
  // CTA events
  CTA_CLICK: 'cta_click',
  HERO_CTA_CLICK: 'hero_cta_click',
  PRICING_CTA_CLICK: 'pricing_cta_click',
  
  // Form events
  FORM_START: 'form_start',
  FORM_SUBMIT: 'form_submit',
  FORM_ERROR: 'form_error',
  
  // Conversion events
  DEMO_REQUEST: 'demo_request',
  DEMO_REQUEST_SUBMIT: 'demo_request_submit',
  TRIAL_START: 'trial_start',
  CONTACT_SUBMIT: 'contact_submit',
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  NEWSLETTER_SUBSCRIBE: 'newsletter_subscribe',
  
  // Engagement events
  PRICING_VIEW: 'pricing_view',
  FEATURE_EXPLORE: 'feature_explore',
  VIDEO_PLAY: 'video_play',
  VIDEO_PROGRESS: 'video_progress',
  VIDEO_COMPLETE: 'video_complete',
  DOWNLOAD: 'download',
  
  // Navigation events
  NAV_MENU_OPEN: 'nav_menu_open',
  DOMAIN_CARD_CLICK: 'domain_card_click',
  
  // Scroll events
  SCROLL_DEPTH: 'scroll_depth'
};

/**
 * Track CTA click
 * @param {string} ctaLocation - Where the CTA is located
 * @param {string} ctaText - CTA button text
 * @param {string} ctaHref - CTA destination URL
 */
export const trackCTAClick = (ctaLocation, ctaText, ctaHref) => {
  trackEvent(EVENTS.CTA_CLICK, {
    cta_location: ctaLocation,
    cta_text: ctaText,
    cta_href: ctaHref
  });
};

/**
 * Track form submission
 * @param {string} formType - Type of form (demo, contact, newsletter)
 * @param {Object} formData - Additional form data
 */
export const trackFormSubmit = (formType, formData = {}) => {
  trackEvent(EVENTS.FORM_SUBMIT, {
    form_type: formType,
    ...formData
  });
};

/**
 * Track form start (first field focus)
 * @param {string} formType - Type of form
 */
export const trackFormStart = (formType) => {
  trackEvent(EVENTS.FORM_START, {
    form_type: formType
  });
};

/**
 * Track form error
 * @param {string} formType - Type of form
 * @param {string} errorField - Field with error
 * @param {string} errorMessage - Error message
 */
export const trackFormError = (formType, errorField, errorMessage) => {
  trackEvent(EVENTS.FORM_ERROR, {
    form_type: formType,
    error_field: errorField,
    error_message: errorMessage
  });
};

/**
 * Track scroll depth
 * @param {number} depth - Scroll depth percentage (25, 50, 75, 100)
 */
export const trackScrollDepth = (depth) => {
  trackEvent(EVENTS.SCROLL_DEPTH, {
    scroll_depth: depth
  });
};

/**
 * Track video interaction
 * @param {string} videoId - Video identifier
 * @param {string} action - Action (play, pause, complete)
 * @param {number} progress - Progress percentage
 */
export const trackVideoInteraction = (videoId, action, progress = 0) => {
  const eventName = action === 'complete' ? EVENTS.VIDEO_COMPLETE : EVENTS.VIDEO_PLAY;
  trackEvent(eventName, {
    video_id: videoId,
    action: action,
    progress: progress
  });
};

/**
 * Track domain card click
 * @param {string} domainSlug - Domain slug
 * @param {string} domainName - Domain name
 */
export const trackDomainCardClick = (domainSlug, domainName) => {
  trackEvent(EVENTS.DOMAIN_CARD_CLICK, {
    domain_slug: domainSlug,
    domain_name: domainName
  });
};

/**
 * Track navigation menu interaction
 * @param {string} menuName - Menu name (solutions, industries, etc.)
 */
export const trackNavMenuOpen = (menuName) => {
  trackEvent(EVENTS.NAV_MENU_OPEN, {
    menu_name: menuName
  });
};
