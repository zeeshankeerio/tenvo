/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual rollout and A/B testing.
 * 
 * Usage:
 * ```javascript
 * import { isFeatureEnabled, FEATURE_FLAGS } from '@/lib/config/featureFlags';
 * 
 * if (isFeatureEnabled(FEATURE_FLAGS.UNIFIED_DASHBOARD)) {
 *   // Use unified dashboard
 * }
 * ```
 */

/**
 * Feature Flag Definitions
 * 
 * Each flag should have:
 * - Descriptive name in SCREAMING_SNAKE_CASE
 * - Environment variable mapping
 * - Default value (usually false for new features)
 * - Documentation comment
 */
export const FEATURE_FLAGS = {
  /**
   * Unified Dashboard System
   * 
   * Enables the consolidated dashboard system with:
   * - RoleBasedDashboardController integration
   * - Domain-specific template selection
   * - Shared component library
   * - Permission-based widget filtering
   * 
   * Environment Variable: NEXT_PUBLIC_ENABLE_UNIFIED_DASHBOARD
   * Default: false (disabled)
   * Rollout: Gradual (10% -> 25% -> 50% -> 75% -> 100%)
   */
  UNIFIED_DASHBOARD: 'UNIFIED_DASHBOARD',

  /**
   * Role-Based Dashboard Templates
   * 
   * Enables role-specific dashboard templates:
   * - Owner Dashboard (full access)
   * - Manager Dashboard (approval queue)
   * - Sales Dashboard (quick invoice)
   * - Inventory Dashboard (stock management)
   * - Accountant Dashboard (financial metrics)
   * 
   * Environment Variable: NEXT_PUBLIC_ENABLE_ROLE_TEMPLATES
   * Default: false (disabled)
   * Rollout: After unified dashboard is stable
   */
  ROLE_TEMPLATES: 'ROLE_TEMPLATES',

  /**
   * Dashboard Layout Persistence
   * 
   * Enables saving and loading custom dashboard layouts:
   * - Drag-and-drop widget arrangement
   * - Multiple layout presets per user
   * - Layout sharing between users
   * 
   * Environment Variable: NEXT_PUBLIC_ENABLE_LAYOUT_PERSISTENCE
   * Default: false (disabled)
   * Rollout: After unified dashboard is stable
   */
  LAYOUT_PERSISTENCE: 'LAYOUT_PERSISTENCE',

  /**
   * Real-Time Dashboard Updates
   * 
   * Enables WebSocket-based real-time updates:
   * - Live metrics updates
   * - Inventory alerts
   * - Order notifications
   * 
   * Environment Variable: NEXT_PUBLIC_ENABLE_REALTIME_UPDATES
   * Default: false (disabled)
   * Rollout: After performance testing
   */
  REALTIME_UPDATES: 'REALTIME_UPDATES',
};

/**
 * Get feature flag value from environment
 * 
 * @param {string} flagName - Feature flag name from FEATURE_FLAGS
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(flagName) {
  // Map flag names to environment variables
  const envVarMap = {
    [FEATURE_FLAGS.UNIFIED_DASHBOARD]: process.env.NEXT_PUBLIC_ENABLE_UNIFIED_DASHBOARD,
    [FEATURE_FLAGS.ROLE_TEMPLATES]: process.env.NEXT_PUBLIC_ENABLE_ROLE_TEMPLATES,
    [FEATURE_FLAGS.LAYOUT_PERSISTENCE]: process.env.NEXT_PUBLIC_ENABLE_LAYOUT_PERSISTENCE,
    [FEATURE_FLAGS.REALTIME_UPDATES]: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES,
  };

  const envValue = envVarMap[flagName];

  // Convert string to boolean
  // Accepts: 'true', '1', 'yes', 'on' (case-insensitive)
  if (typeof envValue === 'string') {
    return ['true', '1', 'yes', 'on'].includes(envValue.toLowerCase());
  }

  // Default to false if not set
  return false;
}

/**
 * Get all enabled features
 * 
 * @returns {string[]} Array of enabled feature flag names
 */
export function getEnabledFeatures() {
  return Object.values(FEATURE_FLAGS).filter(flag => isFeatureEnabled(flag));
}

/**
 * Check if user is in rollout percentage
 * 
 * Used for gradual rollout (e.g., enable for 10% of users)
 * 
 * @param {string} userId - User ID for consistent hashing
 * @param {number} percentage - Rollout percentage (0-100)
 * @returns {boolean} Whether user is in rollout group
 */
export function isInRolloutGroup(userId, percentage) {
  if (!userId || percentage >= 100) return true;
  if (percentage <= 0) return false;

  // Simple hash function for consistent user bucketing
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to percentage (0-99)
  const bucket = Math.abs(hash) % 100;

  return bucket < percentage;
}

/**
 * Feature flag configuration for gradual rollout
 * 
 * Modify these values to control rollout percentage
 */
export const ROLLOUT_CONFIG = {
  [FEATURE_FLAGS.UNIFIED_DASHBOARD]: {
    enabled: false, // Master switch
    percentage: 0, // 0-100, percentage of users to enable for
    allowedRoles: ['owner', 'manager'], // Roles that can access (empty = all)
    allowedBusinessIds: [], // Specific businesses (empty = all)
  },
  [FEATURE_FLAGS.ROLE_TEMPLATES]: {
    enabled: false,
    percentage: 0,
    allowedRoles: [],
    allowedBusinessIds: [],
  },
  [FEATURE_FLAGS.LAYOUT_PERSISTENCE]: {
    enabled: false,
    percentage: 0,
    allowedRoles: [],
    allowedBusinessIds: [],
  },
  [FEATURE_FLAGS.REALTIME_UPDATES]: {
    enabled: false,
    percentage: 0,
    allowedRoles: [],
    allowedBusinessIds: [],
  },
};

/**
 * Check if feature is enabled for specific user/business
 * 
 * Considers:
 * - Global feature flag
 * - Rollout percentage
 * - Role restrictions
 * - Business ID restrictions
 * 
 * @param {string} flagName - Feature flag name
 * @param {Object} context - User/business context
 * @param {string} context.userId - User ID
 * @param {string} context.userRole - User role
 * @param {string} context.businessId - Business ID
 * @returns {boolean} Whether feature is enabled for this context
 */
export function isFeatureEnabledForUser(flagName, context = {}) {
  const { userId, userRole, businessId } = context;

  // Check global feature flag first
  if (!isFeatureEnabled(flagName)) {
    return false;
  }

  // Get rollout configuration
  const config = ROLLOUT_CONFIG[flagName];
  if (!config || !config.enabled) {
    return false;
  }

  // Check role restrictions
  if (config.allowedRoles.length > 0 && userRole) {
    if (!config.allowedRoles.includes(userRole)) {
      return false;
    }
  }

  // Check business ID restrictions
  if (config.allowedBusinessIds.length > 0 && businessId) {
    if (!config.allowedBusinessIds.includes(businessId)) {
      return false;
    }
  }

  // Check rollout percentage
  if (userId && config.percentage < 100) {
    return isInRolloutGroup(userId, config.percentage);
  }

  return true;
}

/**
 * Log feature flag usage for analytics
 * 
 * @param {string} flagName - Feature flag name
 * @param {boolean} enabled - Whether feature was enabled
 * @param {Object} context - User/business context
 */
export function logFeatureUsage(flagName, enabled, context = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Feature Flag]', {
      flag: flagName,
      enabled,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // TODO: Send to analytics service in production
  // analytics.track('feature_flag_used', { flagName, enabled, ...context });
}

/**
 * Get feature flag status for debugging
 * 
 * @returns {Object} Feature flag status
 */
export function getFeatureFlagStatus() {
  return {
    flags: Object.values(FEATURE_FLAGS).map(flag => ({
      name: flag,
      enabled: isFeatureEnabled(flag),
      config: ROLLOUT_CONFIG[flag],
    })),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      enabledFeatures: getEnabledFeatures(),
    },
  };
}
