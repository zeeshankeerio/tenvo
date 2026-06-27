/**
 * Consolidated Server Actions for Business Dashboard
 * Delegates to canonical action modules, no direct DB queries here.
 * This file exists for backward compatibility; all logic lives in lib/actions/.
 */

'use server';

import { revalidatePath } from 'next/cache';

// Re-export from canonical action modules
export { getProductsAction } from '@/lib/actions/standard/inventory/product';
export { getCustomersAction } from '@/lib/actions/basic/customer';
export { getVendorsAction } from '@/lib/actions/basic/vendor';
export { getDashboardKPIs as getDashboardStatsAction } from '@/lib/actions/basic/dashboard';

// ============================================================================
// Utility Actions
// ============================================================================

export async function refreshDataAction(businessId: string) {
    revalidatePath(`/business/${businessId}`);
    return { success: true };
}
