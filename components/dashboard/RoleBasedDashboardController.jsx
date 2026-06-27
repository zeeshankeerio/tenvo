'use client';

import { useMemo } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDomainKnowledge } from '@/lib/domainKnowledge';

// Role-based dashboard templates
import { OwnerDashboard } from './templates/OwnerDashboard';
import { ManagerDashboard } from './templates/ManagerDashboard';
import { SalesDashboard } from './templates/SalesDashboard';
import { InventoryDashboard } from './templates/InventoryDashboard';
import { AccountantDashboard } from './templates/AccountantDashboard';

// Domain-specific dashboard templates (for specialized categories)
import { DashboardTemplateSelector } from './DashboardTemplateSelector';

/**
 * RoleBasedDashboardController
 *
 * Selects the correct dashboard based on user role first, then domain.
 * - owner / admin -> OwnerDashboard (full access + domain widgets)
 * - manager       -> ManagerDashboard (approvals + team + domain widgets)
 * - sales_staff   -> SalesDashboard (quick invoice + customers)
 * - inventory_staff -> InventoryDashboard (stock ops + cycle counts)
 * - accountant    -> AccountantDashboard (financials + FBR compliance)
 * - fallback      -> DashboardTemplateSelector (domain-specific or EnhancedDashboard)
 */
export function RoleBasedDashboardController({
  businessId,
  category,
  user,
  onQuickAction,
}) {
  const userRole = user?.role || 'owner';
  const userId = user?.id;
  const { currency } = useBusiness();

  // Map role -> dashboard component
  const DashboardComponent = useMemo(() => {
    switch (userRole) {
      case 'owner':
      case 'admin':
        return OwnerDashboard;
      case 'manager':
        return ManagerDashboard;
      case 'sales_staff':
        return SalesDashboard;
      case 'inventory_staff':
        return InventoryDashboard;
      case 'accountant':
        return AccountantDashboard;
      default:
        // Unknown role -> fall back to domain template
        return null;
    }
  }, [userRole]);

  // If no role-specific template, use domain template selector
  if (!DashboardComponent) {
    return (
      <DashboardTemplateSelector
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
        userRole={userRole}
      />
    );
  }

  return (
    <DashboardComponent
      businessId={businessId}
      userId={userId}
      category={category}
      currency={currency}
      onQuickAction={onQuickAction}
    />
  );
}

// --- Utility helpers (kept for external use) --------------------------------

export function getRoleDisplayName(role) {
  const roleNames = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    sales_staff: 'Sales Staff',
    inventory_staff: 'Inventory Staff',
    accountant: 'Accountant',
  };
  return roleNames[role] || 'User';
}

export function getRoleFeatures(role) {
  const features = {
    owner: {
      name: 'Owner Dashboard',
      description: 'Complete business overview with all features',
      primaryWidgets: ['revenue', 'inventory', 'team_performance', 'system_health'],
      canApprove: true, canManageUsers: true, canViewFinancials: true, canManageSettings: true,
    },
    manager: {
      name: 'Manager Dashboard',
      description: 'Approval queue and team management',
      primaryWidgets: ['approvals', 'team_productivity', 'inventory_alerts', 'sales_targets'],
      canApprove: true, canManageUsers: false, canViewFinancials: true, canManageSettings: false,
    },
    sales_staff: {
      name: 'Sales Dashboard',
      description: 'Quick sales and customer management',
      primaryWidgets: ['todays_sales', 'quick_invoice', 'customers', 'commission'],
      canApprove: false, canManageUsers: false, canViewFinancials: false, canManageSettings: false,
    },
    inventory_staff: {
      name: 'Inventory Dashboard',
      description: 'Stock management and cycle counting',
      primaryWidgets: ['stock_levels', 'reorder_alerts', 'cycle_count_tasks', 'receiving_queue'],
      canApprove: false, canManageUsers: false, canViewFinancials: false, canManageSettings: false,
    },
    accountant: {
      name: 'Accountant Dashboard',
      description: 'Financial management and tax compliance',
      primaryWidgets: ['financial_summary', 'tax_calculations', 'expense_tracking', 'fbr_compliance'],
      canApprove: false, canManageUsers: false, canViewFinancials: true, canManageSettings: false,
    },
  };
  return features[role] || features.owner;
}

export function hasRolePermission(role, permission) {
  const features = getRoleFeatures(role);
  const permissionMap = {
    approve: features.canApprove,
    manage_users: features.canManageUsers,
    view_financials: features.canViewFinancials,
    manage_settings: features.canManageSettings,
  };
  return permissionMap[permission] || false;
}
