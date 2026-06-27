'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/currency';
import { getPendingApprovalsForUser } from '@/lib/services/multiLevelApproval';

/**
 * PendingApprovalsWidget
 * 
 * Displays pending approval count by type for manager dashboard
 * Shows high-priority approvals first with quick action to open ApprovalQueue
 * 
 * Features:
 * - Display pending approval count by type
 * - Show high-priority approvals first
 * - List recent approval requests with details
 * - Add quick action: "View Approval Queue" -> opens ApprovalQueue
 * - Integrate with existing multiLevelApproval service from Phase 2
 * 
 * Requirements: 6.4, 5.3, 5.4
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {string} props.userRole - User role (manager, director, admin)
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onViewQueue - Callback when user clicks to view approval queue
 */
export function PendingApprovalsWidget({ 
  businessId,
  userId,
  userRole = 'manager',
  currency = 'PKR',
  onViewQueue 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovals();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingApprovals, 30000);
    return () => clearInterval(interval);
  }, [businessId, userId, userRole]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await getPendingApprovalsForUser(userId, businessId, userRole);
      setApprovals(data || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  // Group approvals by priority
  const groupedApprovals = useMemo(() => {
    const high = [];
    const medium = [];
    const low = [];

    approvals.forEach(approval => {
      const value = Math.abs(approval.adjustment?.adjustment_value || 0);
      if (value >= 100000) {
        high.push(approval);
      } else if (value >= 50000) {
        medium.push(approval);
      } else {
        low.push(approval);
      }
    });

    return { high, medium, low };
  }, [approvals]);

  // Get top 3 high-priority approvals for display
  const topApprovals = useMemo(() => {
    return [...groupedApprovals.high, ...groupedApprovals.medium, ...groupedApprovals.low]
      .slice(0, 3);
  }, [groupedApprovals]);

  const totalCount = approvals.length;
  const highPriorityCount = groupedApprovals.high.length;

  const getPriorityColor = (value) => {
    if (value >= 100000) return 'text-red-600 bg-red-50 border-red-200';
    if (value >= 50000) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityLabel = (value) => {
    if (value >= 100000) return t.high_priority || 'High Priority';
    if (value >= 50000) return t.medium_priority || 'Medium Priority';
    return t.low_priority || 'Low Priority';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">
              {t.pending_approvals || 'Pending Approvals'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.awaiting_your_approval || 'Awaiting your approval'}
            </CardDescription>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-inner">
            <FileCheck className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
            <div className="text-2xl font-semibold text-red-700 mb-0.5">
              {highPriorityCount}
            </div>
            <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
              {t.high || 'High'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200">
            <div className="text-2xl font-semibold text-orange-700 mb-0.5">
              {groupedApprovals.medium.length}
            </div>
            <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
              {t.medium || 'Medium'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200">
            <div className="text-2xl font-semibold text-gray-700 mb-0.5">
              {groupedApprovals.low.length}
            </div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              {t.low || 'Low'}
            </div>
          </div>
        </div>

        {/* Recent Approval Requests */}
        {totalCount === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-900 mb-1">
              {t.all_clear || 'All Clear!'}
            </p>
            <p className="text-xs text-gray-500">
              {t.no_pending_approvals || 'No pending approvals at this time'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              {t.recent_requests || 'Recent Requests'}
            </div>
            
            {topApprovals.map((approval) => {
              const adjustment = approval.adjustment || {};
              const value = Math.abs(adjustment.adjustment_value || 0);
              const product = adjustment.products || adjustment.product || {};
              
              return (
                <div 
                  key={approval.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                  onClick={onViewQueue}
                >
                  <div className={`p-2 rounded-lg border ${getPriorityColor(value)}`}>
                    {adjustment.quantity_change > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-900 truncate">
                          {product.name || 'Unknown Product'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.sku || 'N/A'}
                        </div>
                      </div>
                      <Badge className={`${getPriorityColor(value)} border text-[10px] font-bold shrink-0`}>
                        {getPriorityLabel(value)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-bold">
                          {adjustment.quantity_change > 0 ? '+' : ''}
                          {adjustment.quantity_change || 0}
                        </span>
                        <span>*</span>
                        <span className="font-bold text-wine">
                          {formatCurrency(value, currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px]">
                          {formatTimeAgo(adjustment.requested_at || adjustment.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Action Button */}
        {totalCount > 0 && (
          <Button
            onClick={onViewQueue}
            className="w-full bg-wine hover:bg-wine/90 text-white font-bold"
            size="sm"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            {t.view_approval_queue || 'View Approval Queue'}
            {totalCount > 3 && (
              <Badge className="ml-2 bg-white/20 text-white border-0">
                +{totalCount - 3}
              </Badge>
            )}
          </Button>
        )}

        {/* Last Updated */}
        <div className="text-center text-[10px] text-gray-400">
          {t.last_updated || 'Last updated'}: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
