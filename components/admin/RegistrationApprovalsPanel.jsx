'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
  getPendingRegistrations,
  getAllRegistrationRequests,
  approveRegistration,
  rejectRegistration,
  requestMoreInfo,
  bulkApproveRegistrations,
} from '@/lib/actions/admin/registrationApproval';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLAN_TIERS } from '@/lib/config/plans';
import {
  CheckCircle,
  XCircle,
  Info,
  Mail,
  Globe,
  MapPin,
  Tag,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

/**
 * RegistrationApprovalsPanel
 *
 * Shared registration-approvals UI used both by the standalone
 * `/admin/registrations` page and inline in the Platform Admin panel's
 * Registrations tab. Set `embedded` to drop the page chrome (title/background).
 */
export function RegistrationApprovalsPanel({ embedded = false }) {
  const { isPlatformAdmin, isLoading: bizLoading } = useBusiness();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [payTier, setPayTier] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payReference, setPayReference] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDays, setPayDays] = useState(30);

  const paidTierOptions = Object.entries(PLAN_TIERS)
    .filter(([key]) => key !== 'free')
    .map(([key, tier]) => ({ key, name: tier?.name || key }));

  const resetPaymentForm = () => {
    setPayTier('');
    setPayMethod('bank_transfer');
    setPayReference('');
    setPayAmount('');
    setPayDays(30);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedTab === 'pending') {
        const result = await getPendingRegistrations();
        if (result.success) {
          setRequests(result.requests);
          setStats(result.stats || {});
        } else {
          toast.error(result.error || 'Failed to load requests');
        }
      } else {
        const result = await getAllRegistrationRequests({ status: selectedTab, limit: 100 });
        if (result.success) {
          setRequests(result.requests);
        } else {
          toast.error(result.error || 'Failed to load requests');
        }
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  }, [selectedTab]);

  useEffect(() => {
    if (bizLoading) return;
    if (!isPlatformAdmin) {
      setLoading(false);
      return;
    }
    loadRequests();
  }, [isPlatformAdmin, bizLoading, loadRequests]);

  const handleApprove = async (businessId, notes = '') => {
    setProcessing(businessId);
    try {
      const result = await approveRegistration({ businessId, notes });
      if (result.success) {
        toast.success(`Registration approved for ${result.business?.business_name}`);
        setSelectedRequests(prev => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
        await loadRequests();
        setExpandedRequest(null);
      } else {
        toast.error(result.error || 'Failed to approve registration');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve registration');
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveWithPayment = async (businessId) => {
    if (!payTier) {
      toast.error('Select a paid plan to record the payment against');
      return;
    }
    if (!payReference.trim()) {
      toast.error('Enter the payment reference (bank/wallet transaction id)');
      return;
    }
    setProcessing(businessId);
    try {
      const result = await approveRegistration({
        businessId,
        notes: 'Access granted with recorded manual payment.',
        payment: {
          planTier: payTier,
          paymentMethod: payMethod,
          paymentReference: payReference.trim(),
          amountMajor: payAmount ? Number(payAmount) : undefined,
          currency: 'PKR',
          extendDays: Number(payDays) || 30,
        },
      });
      if (result.success) {
        toast.success(result.message || 'Access granted and payment recorded');
        setSelectedRequests(prev => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
        resetPaymentForm();
        await loadRequests();
        setExpandedRequest(null);
      } else {
        toast.error(result.error || 'Failed to grant access with payment');
      }
    } catch (error) {
      console.error('Approve with payment error:', error);
      toast.error('Failed to grant access with payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (businessId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessing(businessId);
    try {
      const result = await rejectRegistration({ businessId, reason: rejectReason });
      if (result.success) {
        toast.success('Registration rejected');
        setSelectedRequests(prev => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
        await loadRequests();
        setExpandedRequest(null);
        setRejectReason('');
      } else {
        toast.error(result.error || 'Failed to reject registration');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject registration');
    } finally {
      setProcessing(null);
    }
  };

  const handleRequestInfo = async (businessId) => {
    if (!infoMessage.trim()) {
      toast.error('Please specify what information is needed');
      return;
    }
    setProcessing(businessId);
    try {
      const result = await requestMoreInfo({ businessId, message: infoMessage });
      if (result.success) {
        toast.success('Information request sent');
        await loadRequests();
        setExpandedRequest(null);
        setInfoMessage('');
      } else {
        toast.error(result.error || 'Failed to request information');
      }
    } catch (error) {
      console.error('Request info error:', error);
      toast.error('Failed to request information');
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) {
      toast.error('No requests selected');
      return;
    }
    const confirmed = confirm(`Approve ${selectedRequests.size} registration${selectedRequests.size === 1 ? '' : 's'}?`);
    if (!confirmed) return;

    setProcessing('bulk');
    try {
      const result = await bulkApproveRegistrations({
        businessIds: Array.from(selectedRequests),
        notes: 'Bulk approved by platform admin',
      });
      if (result.success) {
        toast.success(`Approved ${result.approved} of ${selectedRequests.size} registrations`);
        setSelectedRequests(new Set());
        await loadRequests();
      } else {
        toast.error(result.error || 'Bulk approval failed');
      }
    } catch (error) {
      console.error('Bulk approval error:', error);
      toast.error('Bulk approval failed');
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelection = (businessId) => {
    setSelectedRequests(prev => {
      const next = new Set(prev);
      if (next.has(businessId)) {
        next.delete(businessId);
      } else {
        next.add(businessId);
      }
      return next;
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
      info_requested: { color: 'bg-blue-100 text-blue-800', label: 'Info Requested' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      auto_approved: { color: 'bg-purple-100 text-purple-800', label: 'Auto-Approved' },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  if (!bizLoading && !isPlatformAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-gray-500">
          Registration approvals are available to platform administrators only.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header / bulk actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Registration Approvals</h3>
          <p className="text-sm text-gray-500">
            Review new business registrations. Owners are emailed when approved or rejected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refresh
          </Button>
          {selectedRequests.size > 0 && (
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={processing === 'bulk'}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing === 'bulk' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve Selected ({selectedRequests.size})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Info Requested</p>
                <p className="text-2xl font-bold text-blue-600">{stats.info_requested || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="info_requested">Info Requested</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-wine" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No {selectedTab.replace('_', ' ')} registrations found</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className={cn(
                'transition-all',
                expandedRequest === request.id && 'ring-2 ring-wine'
              )}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {selectedTab === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedRequests.has(request.business_id)}
                            onChange={() => toggleSelection(request.business_id)}
                            className="mt-1 w-4 h-4 text-wine border-gray-300 rounded focus:ring-wine"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {request.business_name}
                            </h4>
                            {getStatusBadge(request.status)}
                            {request.demo_requested && (
                              <Badge className="bg-purple-100 text-purple-800">Demo Requested</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{request.user_email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Tag className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{request.category}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{request.country}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Globe className="w-4 h-4 flex-shrink-0" />
                              <span className="font-mono truncate">{request.domain}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                            <span>Plan: <strong>{request.plan_tier}</strong></span>
                            <span>&bull;</span>
                            <span>Submitted: {new Date(request.requested_at).toLocaleDateString()}</span>
                            {request.phone && (
                              <>
                                <span>&bull;</span>
                                <span>Phone: {request.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {(request.status === 'pending' || request.status === 'info_requested') && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.business_id)}
                            disabled={processing === request.business_id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processing === request.business_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedRequest(
                              expandedRequest === request.id ? null : request.id
                            )}
                          >
                            <Info className="w-4 h-4 mr-1" />
                            {expandedRequest === request.id ? 'Close' : 'More'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expanded Actions */}
                    {expandedRequest === request.id && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                          <label className="block text-sm font-semibold text-gray-900 mb-1">
                            Record payment &amp; grant access
                          </label>
                          <p className="text-xs text-gray-600 mb-3">
                            Optional. Record an offline payment and activate a paid plan while approving. Leave blank and use &ldquo;Approve&rdquo; above to grant free/trial access only.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            <select
                              value={payTier}
                              onChange={(e) => setPayTier(e.target.value)}
                              className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                            >
                              <option value="">Select paid plan…</option>
                              {paidTierOptions.map((t) => (
                                <option key={t.key} value={t.key}>{t.name}</option>
                              ))}
                            </select>
                            <select
                              value={payMethod}
                              onChange={(e) => setPayMethod(e.target.value)}
                              className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                            >
                              {['bank_transfer', 'jazzcash', 'easypaisa', 'cash', 'other'].map((m) => (
                                <option key={m} value={m}>{m.replace('_', ' ')}</option>
                              ))}
                            </select>
                            <Input
                              placeholder="Payment reference / txn id"
                              value={payReference}
                              onChange={(e) => setPayReference(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Amount received (PKR)"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Access days (default 30)"
                              value={payDays}
                              onChange={(e) => setPayDays(e.target.value)}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApproveWithPayment(request.business_id)}
                            disabled={processing === request.business_id || !payTier || !payReference.trim()}
                            className="mt-3 bg-green-600 hover:bg-green-700"
                          >
                            {processing === request.business_id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Record payment &amp; grant access
                          </Button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Request More Information
                          </label>
                          <Textarea
                            value={infoMessage}
                            onChange={(e) => setInfoMessage(e.target.value)}
                            placeholder="What additional information do you need?"
                            rows={3}
                            className="mb-2"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleRequestInfo(request.business_id)}
                            disabled={processing === request.business_id || !infoMessage.trim()}
                          >
                            <Info className="w-4 h-4 mr-1" />
                            Send Request
                          </Button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reject Registration
                          </label>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (will be sent to user)"
                            rows={3}
                            className="mb-2"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.business_id)}
                            disabled={processing === request.business_id || !rejectReason.trim()}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject Registration
                          </Button>
                        </div>
                      </div>
                    )}

                    {request.decision_notes && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Decision Notes:</p>
                        <p className="text-sm text-gray-600">{request.decision_notes}</p>
                        {request.decided_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Decided on {new Date(request.decided_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RegistrationApprovalsPanel;
