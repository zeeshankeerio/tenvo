/**
 * Multi-Level Approval Service
 * 
 * Manages multi-level approval workflows for stock adjustments.
 * Supports hierarchical approval chains (staff -> manager -> director -> admin).
 * 
 * Features:
 * - Dynamic approval level determination based on adjustment value
 * - Approval chain tracking with audit trail
 * - Role-based approval routing
 * - Automatic status updates
 * 
 * Requirements: 5.6
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Approval roles hierarchy
 */
export const APPROVAL_ROLES = {
  STAFF: 'staff',
  MANAGER: 'manager',
  DIRECTOR: 'director',
  ADMIN: 'admin',
};

/**
 * Default approval rules
 * These can be customized per business
 */
export const DEFAULT_APPROVAL_RULES = [
  {
    rule_name: 'Low Value Adjustments',
    min_value: 0,
    max_value: 10000,
    approval_levels: [
      { level: 1, role: APPROVAL_ROLES.MANAGER, description: 'Manager Approval' },
    ],
  },
  {
    rule_name: 'Medium Value Adjustments',
    min_value: 10001,
    max_value: 50000,
    approval_levels: [
      { level: 1, role: APPROVAL_ROLES.MANAGER, description: 'Manager Approval' },
      { level: 2, role: APPROVAL_ROLES.DIRECTOR, description: 'Director Approval' },
    ],
  },
  {
    rule_name: 'High Value Adjustments',
    min_value: 50001,
    max_value: null, // No upper limit
    approval_levels: [
      { level: 1, role: APPROVAL_ROLES.MANAGER, description: 'Manager Approval' },
      { level: 2, role: APPROVAL_ROLES.DIRECTOR, description: 'Director Approval' },
      { level: 3, role: APPROVAL_ROLES.ADMIN, description: 'Admin Approval' },
    ],
  },
];

/**
 * Initialize approval rules for a business
 * 
 * @param {string} businessId - Business ID
 * @param {Array} rules - Custom approval rules (optional, uses defaults if not provided)
 * @returns {Promise<Object>} Result with success status
 */
export async function initializeApprovalRules(businessId, rules = DEFAULT_APPROVAL_RULES) {
  try {
    const supabase = createClient();
    
    // Check if rules already exist
    const { data: existingRules, error: checkError } = await supabase
      .from('approval_rules')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (checkError) throw checkError;

    // If rules exist, skip initialization
    if (existingRules && existingRules.length > 0) {
      return {
        success: true,
        message: 'Approval rules already initialized',
        skipped: true,
      };
    }

    // Insert default rules
    const rulesToInsert = rules.map((rule, index) => ({
      business_id: businessId,
      rule_name: rule.rule_name,
      min_value: rule.min_value,
      max_value: rule.max_value,
      approval_levels: rule.approval_levels,
      is_active: true,
      priority: rules.length - index, // Higher priority for higher values
    }));

    const { data, error } = await supabase
      .from('approval_rules')
      .insert(rulesToInsert)
      .select();

    if (error) throw error;

    return {
      success: true,
      rules: data,
      message: `Initialized ${data.length} approval rules`,
    };
  } catch (error) {
    console.error('Error initializing approval rules:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get required approval levels for an adjustment value
 * 
 * @param {string} businessId - Business ID
 * @param {number} adjustmentValue - Adjustment value in PKR
 * @returns {Promise<Array>} Array of approval levels
 */
export async function getRequiredApprovalLevels(businessId, adjustmentValue) {
  try {
    const supabase = createClient();
    
    // Call database function to get required levels
    const { data, error } = await supabase
      .rpc('get_required_approval_levels', {
        p_business_id: businessId,
        p_adjustment_value: Math.abs(adjustmentValue),
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting required approval levels:', error);
    // Return default single-level approval on error
    return [{ level: 1, role: APPROVAL_ROLES.MANAGER, description: 'Manager Approval' }];
  }
}

/**
 * Initialize approval chain for an adjustment
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @param {string} businessId - Business ID
 * @param {number} adjustmentValue - Adjustment value in PKR
 * @returns {Promise<Object>} Result with success status and approval chain
 */
export async function initializeApprovalChain(adjustmentId, businessId, adjustmentValue) {
  try {
    const supabase = createClient();
    
    // Get required approval levels
    const approvalLevels = await getRequiredApprovalLevels(businessId, adjustmentValue);

    // Create approval chain entries
    const chainEntries = approvalLevels.map(level => ({
      business_id: businessId,
      adjustment_id: adjustmentId,
      approval_level: level.level,
      required_role: level.role,
      decision: 'pending',
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('approval_chain')
      .insert(chainEntries)
      .select();

    if (error) throw error;

    return {
      success: true,
      approvalChain: data,
      totalLevels: data.length,
      message: `Initialized ${data.length}-level approval chain`,
    };
  } catch (error) {
    console.error('Error initializing approval chain:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get approval chain for an adjustment
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @returns {Promise<Array>} Array of approval chain entries
 */
export async function getApprovalChain(adjustmentId) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('approval_chain')
      .select('*')
      .eq('adjustment_id', adjustmentId)
      .order('approval_level', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting approval chain:', error);
    return [];
  }
}

/**
 * Get current approval level for an adjustment
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @returns {Promise<number>} Current approval level (0 if all approved)
 */
export async function getCurrentApprovalLevel(adjustmentId) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_current_approval_level', {
        p_adjustment_id: adjustmentId,
      });

    if (error) throw error;

    return data || 0;
  } catch (error) {
    console.error('Error getting current approval level:', error);
    return 0;
  }
}

/**
 * Check if adjustment is fully approved
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @returns {Promise<boolean>} True if fully approved
 */
export async function isFullyApproved(adjustmentId) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('is_fully_approved', {
        p_adjustment_id: adjustmentId,
      });

    if (error) throw error;

    return data === true;
  } catch (error) {
    console.error('Error checking if fully approved:', error);
    return false;
  }
}

/**
 * Approve adjustment at current level
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @param {string} approverId - Approver user ID
 * @param {string} approverName - Approver name
 * @param {string} notes - Approval notes
 * @returns {Promise<Object>} Result with success status
 */
export async function approveAtLevel(adjustmentId, approverId, approverName, notes = '') {
  try {
    const supabase = createClient();
    
    // Get current approval level
    const currentLevel = await getCurrentApprovalLevel(adjustmentId);
    
    if (currentLevel === 0) {
      return {
        success: false,
        error: 'Adjustment is already fully approved',
      };
    }

    // Update approval chain entry for current level
    const { data, error } = await supabase
      .from('approval_chain')
      .update({
        approver_id: approverId,
        approver_name: approverName,
        decision: 'approved',
        decision_at: new Date().toISOString(),
        decision_notes: notes,
      })
      .eq('adjustment_id', adjustmentId)
      .eq('approval_level', currentLevel)
      .eq('decision', 'pending')
      .select()
      .single();

    if (error) throw error;

    // Check if fully approved now
    const fullyApproved = await isFullyApproved(adjustmentId);
    
    // Get next level if not fully approved
    const nextLevel = fullyApproved ? 0 : await getCurrentApprovalLevel(adjustmentId);

    return {
      success: true,
      approvedLevel: currentLevel,
      nextLevel,
      fullyApproved,
      message: fullyApproved 
        ? 'Adjustment fully approved' 
        : `Level ${currentLevel} approved, pending level ${nextLevel}`,
    };
  } catch (error) {
    console.error('Error approving at level:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reject adjustment at current level
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @param {string} approverId - Approver user ID
 * @param {string} approverName - Approver name
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Result with success status
 */
export async function rejectAtLevel(adjustmentId, approverId, approverName, reason) {
  try {
    const supabase = createClient();
    
    // Get current approval level
    const currentLevel = await getCurrentApprovalLevel(adjustmentId);
    
    if (currentLevel === 0) {
      return {
        success: false,
        error: 'Adjustment is already fully approved',
      };
    }

    // Update approval chain entry for current level
    const { data, error } = await supabase
      .from('approval_chain')
      .update({
        approver_id: approverId,
        approver_name: approverName,
        decision: 'rejected',
        decision_at: new Date().toISOString(),
        decision_notes: reason,
      })
      .eq('adjustment_id', adjustmentId)
      .eq('approval_level', currentLevel)
      .eq('decision', 'pending')
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      rejectedLevel: currentLevel,
      message: `Adjustment rejected at level ${currentLevel}`,
    };
  } catch (error) {
    console.error('Error rejecting at level:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pending approvals for a user
 * 
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @param {string} userRole - User role (manager, director, admin)
 * @returns {Promise<Array>} Array of pending adjustments requiring approval
 */
export async function getPendingApprovalsForUser(userId, businessId, userRole) {
  try {
    const supabase = createClient();
    
    // Get pending approval chain entries for user's role
    const { data: chainEntries, error: chainError } = await supabase
      .from('approval_chain')
      .select(`
        *,
        stock_adjustments (
          *,
          products (id, name, sku),
          warehouses (id, name),
          requester:requested_by (id, email)
        )
      `)
      .eq('business_id', businessId)
      .eq('required_role', userRole)
      .eq('decision', 'pending');

    if (chainError) throw chainError;

    // Filter to only include adjustments where this is the current level
    const pendingApprovals = [];
    
    for (const entry of chainEntries || []) {
      const currentLevel = await getCurrentApprovalLevel(entry.adjustment_id);
      if (currentLevel === entry.approval_level) {
        pendingApprovals.push({
          ...entry,
          adjustment: entry.stock_adjustments,
        });
      }
    }

    return pendingApprovals;
  } catch (error) {
    console.error('Error getting pending approvals for user:', error);
    return [];
  }
}

/**
 * Get approval chain summary for display
 * 
 * @param {string} adjustmentId - Adjustment ID
 * @returns {Promise<Array>} Array of approval chain entries with status
 */
export async function getApprovalChainSummary(adjustmentId) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .rpc('get_approval_chain_summary', {
        p_adjustment_id: adjustmentId,
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting approval chain summary:', error);
    return [];
  }
}

/**
 * Get approval rules for a business
 * 
 * @param {string} businessId - Business ID
 * @returns {Promise<Array>} Array of approval rules
 */
export async function getApprovalRules(businessId) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting approval rules:', error);
    return [];
  }
}

/**
 * Update approval rule
 * 
 * @param {string} ruleId - Rule ID
 * @param {Object} updates - Rule updates
 * @returns {Promise<Object>} Result with success status
 */
export async function updateApprovalRule(ruleId, updates) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('approval_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      rule: data,
      message: 'Approval rule updated successfully',
    };
  } catch (error) {
    console.error('Error updating approval rule:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create custom approval rule
 * 
 * @param {string} businessId - Business ID
 * @param {Object} rule - Rule configuration
 * @returns {Promise<Object>} Result with success status
 */
export async function createApprovalRule(businessId, rule) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('approval_rules')
      .insert({
        business_id: businessId,
        ...rule,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      rule: data,
      message: 'Approval rule created successfully',
    };
  } catch (error) {
    console.error('Error creating approval rule:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete approval rule
 * 
 * @param {string} ruleId - Rule ID
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteApprovalRule(ruleId) {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('approval_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;

    return {
      success: true,
      message: 'Approval rule deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting approval rule:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
