/**
 * Form Error Handler Utility
 * 
 * Provides centralized error handling for server action results in forms.
 * Maps action failure codes to user-friendly messages with appropriate
 * upgrade prompts and contextual information.
 * 
 * Usage:
 * ```javascript
 * import { parseActionError, showActionError } from '@/lib/utils/formErrorHandler';
 * 
 * const result = await someAction(data);
 * if (!result.success) {
 *   const errorInfo = parseActionError(result);
 *   toast.error(errorInfo.message);
 *   // Or use the convenience function:
 *   showActionError(result);
 * }
 * ```
 */

import toast from 'react-hot-toast';

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES = {
  // Plan & Subscription Errors
  PLAN_UPGRADE_REQUIRED: {
    message: 'This feature requires a plan upgrade',
    type: 'upgrade',
    action: 'Upgrade your plan to access this feature',
  },
  LIMIT_REACHED: {
    message: 'You have reached your plan limit',
    type: 'upgrade',
    action: 'Upgrade your plan to increase limits',
  },
  FEATURE_NOT_AVAILABLE: {
    message: 'This feature is not available on your current plan',
    type: 'upgrade',
    action: 'Upgrade to access this feature',
  },

  // Permission Errors
  PERMISSION_DENIED: {
    message: 'You do not have permission to perform this action',
    type: 'permission',
    action: 'Contact your administrator for access',
  },
  BUSINESS_ACCESS_DENIED: {
    message: 'You do not have access to this business',
    type: 'permission',
    action: 'Contact the business owner for access',
  },
  OWNER_ROLE_LOCKED: {
    message: 'Owner role cannot be modified',
    type: 'permission',
    action: null,
  },
  OWNER_REMOVAL_BLOCKED: {
    message: 'Owner cannot be removed from the business',
    type: 'permission',
    action: null,
  },

  // Validation Errors
  VALIDATION_ERROR: {
    message: 'Please check your input and try again',
    type: 'validation',
    action: null,
  },
  INVALID_DOMAIN_CATEGORY: {
    message: 'Selected business domain is not supported',
    type: 'validation',
    action: null,
  },
  INVALID_DOMAIN_HANDLE: {
    message: 'Domain handle must be at least 3 characters',
    type: 'validation',
    action: null,
  },
  INVALID_ROLE: {
    message: 'Selected role is not valid',
    type: 'validation',
    action: null,
  },

  // Duplicate/Conflict Errors
  DUPLICATE_INVOICE_NUMBER: {
    message: 'Invoice number already exists',
    type: 'conflict',
    action: 'Please use a different invoice number',
  },
  DUPLICATE_PURCHASE_NUMBER: {
    message: 'Purchase number already exists',
    type: 'conflict',
    action: 'Please use a different purchase number',
  },
  DUPLICATE_PRODUCT_SKU: {
    message: 'Product SKU already exists',
    type: 'conflict',
    action: 'Please use a different SKU',
  },

  // Not Found Errors
  BUSINESS_NOT_FOUND: {
    message: 'Business not found',
    type: 'not_found',
    action: null,
  },
  INVOICE_NOT_FOUND: {
    message: 'Invoice not found',
    type: 'not_found',
    action: null,
  },
  PURCHASE_NOT_FOUND: {
    message: 'Purchase not found',
    type: 'not_found',
    action: null,
  },
  PRODUCT_NOT_FOUND: {
    message: 'Product not found',
    type: 'not_found',
    action: null,
  },
  CUSTOMER_NOT_FOUND: {
    message: 'Customer not found',
    type: 'not_found',
    action: null,
  },
  VENDOR_NOT_FOUND: {
    message: 'Vendor not found',
    type: 'not_found',
    action: null,
  },
  MEMBER_NOT_FOUND: {
    message: 'Member not found',
    type: 'not_found',
    action: null,
  },
  USER_NOT_FOUND: {
    message: 'User not found',
    type: 'not_found',
    action: 'Ask them to register first',
  },

  // Stock/Inventory Errors
  INSUFFICIENT_STOCK: {
    message: 'Insufficient stock available',
    type: 'stock',
    action: 'Reduce quantity or restock the product',
  },
  STOCK_NOT_AVAILABLE: {
    message: 'Stock not available in selected warehouse',
    type: 'stock',
    action: 'Select a different warehouse or restock',
  },

  // Generic Operation Errors
  CREATE_FAILED: {
    message: 'Failed to create record',
    type: 'error',
    action: 'Please try again',
  },
  UPDATE_FAILED: {
    message: 'Failed to update record',
    type: 'error',
    action: 'Please try again',
  },
  DELETE_FAILED: {
    message: 'Failed to delete record',
    type: 'error',
    action: 'Please try again',
  },
};

/**
 * Parse action result and return structured error information
 * 
 * @param {Object} result - Action result object with { success, code, error, details }
 * @returns {Object} Structured error information
 */
export function parseActionError(result) {
  if (!result || result.success) {
    return null;
  }

  const code = result.code || 'UNKNOWN_ERROR';
  const errorConfig = ERROR_MESSAGES[code];

  // If we have a predefined error message, use it
  if (errorConfig) {
    return {
      code,
      message: errorConfig.message,
      type: errorConfig.type,
      action: errorConfig.action,
      details: result.details || null,
      originalError: result.error,
    };
  }

  // Fallback: use the error message from the result
  return {
    code,
    message: result.error || 'An unexpected error occurred',
    type: 'error',
    action: 'Please try again or contact support',
    details: result.details || null,
    originalError: result.error,
  };
}

/**
 * Show error toast with appropriate message and action
 * 
 * @param {Object} result - Action result object
 * @param {Object} options - Toast options
 * @returns {void}
 */
export function showActionError(result, options = {}) {
  const errorInfo = parseActionError(result);
  
  if (!errorInfo) {
    return;
  }

  const { message, action, type } = errorInfo;

  // Build the full error message
  let fullMessage = message;
  if (action) {
    fullMessage += `\n${action}`;
  }

  // Show toast with appropriate styling based on error type
  const toastOptions = {
    duration: type === 'upgrade' ? 6000 : 4000,
    ...options,
  };

  toast.error(fullMessage, toastOptions);
}

/**
 * Format validation errors from result.details into field-level errors
 * 
 * @param {Object} result - Action result with validation errors in details
 * @returns {Object} Field-level error object { fieldName: errorMessage }
 */
export function formatValidationErrors(result) {
  if (!result || !result.details) {
    return {};
  }

  // If details is already a flat object of field errors, return it
  if (typeof result.details === 'object' && !Array.isArray(result.details)) {
    return result.details;
  }

  // If details is an array (Zod error format), convert to flat object
  if (Array.isArray(result.details)) {
    const errors = {};
    result.details.forEach(error => {
      const field = error.path?.join('.') || '_general';
      errors[field] = error.message;
    });
    return errors;
  }

  return {};
}

/**
 * Check if error requires plan upgrade
 * 
 * @param {Object} result - Action result object
 * @returns {boolean}
 */
export function isUpgradeRequired(result) {
  if (!result || result.success) {
    return false;
  }

  const upgradeErrorCodes = [
    'PLAN_UPGRADE_REQUIRED',
    'LIMIT_REACHED',
    'FEATURE_NOT_AVAILABLE',
  ];

  return upgradeErrorCodes.includes(result.code);
}

/**
 * Check if error is a permission error
 * 
 * @param {Object} result - Action result object
 * @returns {boolean}
 */
export function isPermissionError(result) {
  if (!result || result.success) {
    return false;
  }

  const permissionErrorCodes = [
    'PERMISSION_DENIED',
    'BUSINESS_ACCESS_DENIED',
    'OWNER_ROLE_LOCKED',
    'OWNER_REMOVAL_BLOCKED',
  ];

  return permissionErrorCodes.includes(result.code);
}

/**
 * Check if error is a validation error
 * 
 * @param {Object} result - Action result object
 * @returns {boolean}
 */
export function isValidationError(result) {
  if (!result || result.success) {
    return false;
  }

  return result.code === 'VALIDATION_ERROR';
}

/**
 * Get upgrade URL based on current plan
 * 
 * @returns {string} URL to upgrade page
 */
export function getUpgradeUrl() {
  return '/settings?tab=subscription';
}

/**
 * Show upgrade prompt with action button
 * 
 * @param {Object} result - Action result object
 * @returns {void}
 */
export function showUpgradePrompt(result) {
  const errorInfo = parseActionError(result);
  
  if (!errorInfo || errorInfo.type !== 'upgrade') {
    return;
  }

  toast.error(
    (t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium">{errorInfo.message}</p>
        {errorInfo.action && <p className="text-sm">{errorInfo.action}</p>}
        <button
          onClick={() => {
            toast.dismiss(t.id);
            window.location.href = getUpgradeUrl();
          }}
          className="mt-2 px-3 py-1 bg-white text-gray-900 rounded text-sm font-medium hover:bg-gray-100"
        >
          Upgrade Now
        </button>
      </div>
    ),
    { duration: 8000 }
  );
}
