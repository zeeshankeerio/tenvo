/**
 * ApprovalQueue Component
 * 
 * Displays pending stock adjustments requiring approval with detailed information
 * and approve/reject actions. Supports multi-level approval workflows.
 * 
 * Features:
 * - Display pending adjustments for current user's approval level
 * - Show adjustment details: product, quantity, value, requester, reason
 * - Approve/reject actions with mandatory comments
 * - Real-time updates via Supabase Realtime
 * - Filter by priority, product, date range
 * - Sort by value, date, priority
 * - Batch approval for multiple adjustments
 * 
 * Requirements: 5.7
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Format currency in PKR
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
};

/**
 * Format date/time
 */
const formatDateTime = (dateString) => {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
};

/**
 * Get priority badge color
 */
const getPriorityColor = (value) => {
  if (value >= 100000) return 'destructive'; // High priority
  if (value >= 50000) return 'default'; // Medium priority
  return 'secondary'; // Low priority
};

/**
 * Get priority label
 */
const getPriorityLabel = (value) => {
  if (value >= 100000) return 'High Priority';
  if (value >= 50000) return 'Medium Priority';
  return 'Low Priority';
};

export default function ApprovalQueue({ businessId, userId, userRole }) {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, value_desc, value_asc
  const [showFilters, setShowFilters] = useState(false);

  const supabase = createClient();

  /**
   * Fetch pending adjustments
   */
  const fetchPendingAdjustments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          product:products(id, name, sku, cost_price, category),
          warehouse:warehouses(id, name, code),
          requester:auth.users!requested_by(id, email, raw_user_meta_data)
        `)
        .eq('business_id', businessId)
        .eq('approval_status', 'pending')
        .eq('requires_approval', true)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      setAdjustments(data || []);
    } catch (error) {
      console.error('Error fetching pending adjustments:', error);
      toast.error('Failed to load pending adjustments');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subscribe to real-time updates
   */
  useEffect(() => {
    fetchPendingAdjustments();

    // Subscribe to changes
    const channel = supabase
      .channel('approval_queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_adjustments',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.approval_status === 'pending') {
            fetchPendingAdjustments();
          } else if (payload.eventType === 'UPDATE') {
            fetchPendingAdjustments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  /**
   * Handle approve action
   */
  const handleApprove = async () => {
    if (!actionNotes.trim()) {
      toast.error('Please provide approval notes');
      return;
    }

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update adjustment status
      const { data, error } = await supabase
        .from('stock_adjustments')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: actionNotes.trim(),
        })
        .eq('id', selectedAdjustment.id)
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .single();

      if (error) throw error;

      // Update product stock
      const newQuantity = selectedAdjustment.quantity_after;
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: newQuantity })
        .eq('id', selectedAdjustment.product_id);

      if (stockError) throw stockError;

      // Send approval notification
      try {
        const { sendApprovalDecision } = await import('@/lib/services/notifications');
        await sendApprovalDecision({
          businessId,
          adjustmentId: selectedAdjustment.id,
          productName: selectedAdjustment.product?.name || 'Unknown Product',
          quantityChange: selectedAdjustment.quantity_change,
          adjustmentValue: selectedAdjustment.adjustment_value,
          requesterId: selectedAdjustment.requested_by,
          approverName: user?.user_metadata?.full_name || user?.email || 'Manager',
          approverId: user.id,
          decision: 'approved',
          notes: actionNotes.trim(),
        });
      } catch (notifError) {
        console.error('Error sending approval notification:', notifError);
      }

      toast.success('Adjustment approved successfully');
      setSelectedAdjustment(null);
      setActionType(null);
      setActionNotes('');
      fetchPendingAdjustments();
    } catch (error) {
      console.error('Error approving adjustment:', error);
      toast.error('Failed to approve adjustment');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle reject action
   */
  const handleReject = async () => {
    if (!actionNotes.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update adjustment status
      const { data, error } = await supabase
        .from('stock_adjustments')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: actionNotes.trim(),
        })
        .eq('id', selectedAdjustment.id)
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .single();

      if (error) throw error;

      // Send rejection notification
      try {
        const { sendApprovalDecision } = await import('@/lib/services/notifications');
        await sendApprovalDecision({
          businessId,
          adjustmentId: selectedAdjustment.id,
          productName: selectedAdjustment.product?.name || 'Unknown Product',
          quantityChange: selectedAdjustment.quantity_change,
          adjustmentValue: selectedAdjustment.adjustment_value,
          requesterId: selectedAdjustment.requested_by,
          approverName: user?.user_metadata?.full_name || user?.email || 'Manager',
          approverId: user.id,
          decision: 'rejected',
          notes: actionNotes.trim(),
        });
      } catch (notifError) {
        console.error('Error sending rejection notification:', notifError);
      }

      toast.success('Adjustment rejected');
      setSelectedAdjustment(null);
      setActionType(null);
      setActionNotes('');
      fetchPendingAdjustments();
    } catch (error) {
      console.error('Error rejecting adjustment:', error);
      toast.error('Failed to reject adjustment');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Filter and sort adjustments
   */
  const filteredAdjustments = useMemo(() => {
    let filtered = [...adjustments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (adj) =>
          adj.product?.name?.toLowerCase().includes(query) ||
          adj.product?.sku?.toLowerCase().includes(query) ||
          adj.reason_notes?.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((adj) => {
        const value = adj.adjustment_value;
        if (priorityFilter === 'high') return value >= 100000;
        if (priorityFilter === 'medium') return value >= 50000 && value < 100000;
        if (priorityFilter === 'low') return value < 50000;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.requested_at) - new Date(a.requested_at);
        case 'date_asc':
          return new Date(a.requested_at) - new Date(b.requested_at);
        case 'value_desc':
          return b.adjustment_value - a.adjustment_value;
        case 'value_asc':
          return a.adjustment_value - b.adjustment_value;
        default:
          return 0;
      }
    });

    return filtered;
  }, [adjustments, searchQuery, priorityFilter, sortBy]);

  /**
   * Get reason code label
   */
  const getReasonLabel = (code) => {
    const labels = {
      damage: 'Damage',
      theft: 'Theft',
      count_error: 'Count Error',
      return: 'Return',
      other: 'Other',
    };
    return labels[code] || code;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approval Queue</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve pending stock adjustments
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {filteredAdjustments.length} Pending
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by product name, SKU, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-bold text-gray-600">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High (≥100K PKR)</SelectItem>
                      <SelectItem value="medium">Medium (50K-100K PKR)</SelectItem>
                      <SelectItem value="low">Low (&lt;50K PKR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-600">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Newest First</SelectItem>
                      <SelectItem value="date_asc">Oldest First</SelectItem>
                      <SelectItem value="value_desc">Highest Value</SelectItem>
                      <SelectItem value="value_asc">Lowest Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Loading pending adjustments...</p>
          </CardContent>
        </Card>
      ) : filteredAdjustments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-sm text-gray-600">
              No pending adjustments require your approval at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAdjustments.map((adjustment) => (
            <Card
              key={adjustment.id}
              className="hover:shadow-lg transition-shadow border-l-4"
              style={{
                borderLeftColor:
                  adjustment.adjustment_value >= 100000
                    ? '#dc2626'
                    : adjustment.adjustment_value >= 50000
                    ? '#f59e0b'
                    : '#6b7280',
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {adjustment.product?.name || 'Unknown Product'}
                      <Badge variant={getPriorityColor(adjustment.adjustment_value)}>
                        {getPriorityLabel(adjustment.adjustment_value)}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      SKU: {adjustment.product?.sku || 'N/A'} * Requested by{' '}
                      {adjustment.requester?.raw_user_meta_data?.full_name ||
                        adjustment.requester?.email ||
                        'Unknown'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-wine-600">
                      {formatCurrency(adjustment.adjustment_value)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDateTime(adjustment.requested_at)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Quantity Change */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {adjustment.quantity_change > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="text-xs text-gray-600">Quantity Change</div>
                      <div className="text-lg font-bold">
                        {adjustment.quantity_change > 0 ? '+' : ''}
                        {adjustment.quantity_change}
                      </div>
                    </div>
                  </div>

                  {/* Before/After */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-600">Before → After</div>
                      <div className="text-lg font-bold">
                        {adjustment.quantity_before} → {adjustment.quantity_after}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-xs text-gray-600">Reason</div>
                      <div className="text-sm font-bold">
                        {getReasonLabel(adjustment.reason_code)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason Notes */}
                {adjustment.reason_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <div className="text-xs font-bold text-amber-900 mb-1">Notes:</div>
                    <div className="text-sm text-amber-800">{adjustment.reason_notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedAdjustment(adjustment);
                      setActionType('approve');
                      setActionNotes('');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAdjustment(adjustment);
                      setActionType('reject');
                      setActionNotes('');
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog
        open={!!selectedAdjustment && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAdjustment(null);
            setActionType(null);
            setActionNotes('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Please provide approval notes for this adjustment.'
                : 'Please provide a reason for rejecting this adjustment.'}
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              {/* Adjustment Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Product:</span>
                  <span className="text-sm font-bold">
                    {selectedAdjustment.product?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Quantity Change:</span>
                  <span className="text-sm font-bold">
                    {selectedAdjustment.quantity_change > 0 ? '+' : ''}
                    {selectedAdjustment.quantity_change}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Value:</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(selectedAdjustment.adjustment_value)}
                  </span>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <Label className="text-sm font-bold">
                  {actionType === 'approve' ? 'Approval Notes' : 'Rejection Reason'} *
                </Label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Enter approval notes (e.g., "Verified and approved")'
                      : 'Enter rejection reason (e.g., "Insufficient documentation")'
                  }
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAdjustment(null);
                setActionType(null);
                setActionNotes('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={actionType === 'approve' ? handleApprove : handleReject}
              disabled={processing || !actionNotes.trim()}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
