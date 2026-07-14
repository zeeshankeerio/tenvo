'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star,
  ExternalLink,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  listCustomDomainsAction,
  addCustomDomainAction,
  verifyCustomDomainAction,
  setPrimaryDomainAction,
  removeCustomDomainAction,
} from '@/lib/actions/storefront/customDomains';

export function CustomDomainManager({ businessId, businessDomain }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dnsInstructionsOpen, setDnsInstructionsOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [verifying, setVerifying] = useState({});
  const [copied, setCopied] = useState(false);

  const CNAME_TARGET = 'proxy.tenvo.store';

  useEffect(() => {
    loadDomains();
  }, [businessId]);

  const loadDomains = async () => {
    setLoading(true);
    try {
      const result = await listCustomDomainsAction(businessId);
      if (result.success) {
        setDomains(result.domains || []);
      } else {
        toast.error(result.error || 'Failed to load domains');
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load custom domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setAdding(true);
    try {
      const result = await addCustomDomainAction(businessId, newDomain);
      if (result.success) {
        toast.success('Domain added! Please configure DNS and verify.');
        setNewDomain('');
        setAddDialogOpen(false);
        setDnsInstructionsOpen(true);
        loadDomains();
      } else {
        toast.error(result.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    setVerifying((prev) => ({ ...prev, [domainId]: true }));
    try {
      const result = await verifyCustomDomainAction(businessId, domainId);
      if (result.success) {
        toast.success('Domain verified and activated!');
        loadDomains();
      } else {
        toast.error(result.error || 'DNS verification failed. Please check your CNAME record.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    } finally {
      setVerifying((prev) => ({ ...prev, [domainId]: false }));
    }
  };

  const handleSetPrimary = async (domainId) => {
    try {
      const result = await setPrimaryDomainAction(businessId, domainId);
      if (result.success) {
        toast.success('Primary domain updated');
        loadDomains();
      } else {
        toast.error(result.error || 'Failed to set primary domain');
      }
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('Failed to set primary domain');
    }
  };

  const handleRemoveDomain = async () => {
    if (!selectedDomain) return;

    try {
      const result = await removeCustomDomainAction(businessId, selectedDomain.id);
      if (result.success) {
        toast.success('Domain removed');
        setDeleteDialogOpen(false);
        setSelectedDomain(null);
        loadDomains();
      } else {
        toast.error(result.error || 'Failed to remove domain');
      }
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Failed to remove domain');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomainStatus = (domain) => {
    if (!domain.isVerified) {
      return {
        label: 'Pending Verification',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="w-3 h-3" />,
      };
    }
    if (!domain.isActive) {
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    }
    return {
      label: 'Active',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" /> Custom Domains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> Custom Domains
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Connect your own domain to your storefront
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Domain
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-600 font-medium mb-1">No custom domains yet</p>
              <p className="text-xs text-gray-400 mb-4">
                Add your own domain to make your store more professional
              </p>
              <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Your First Domain
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {domains.map((domain) => {
                const status = getDomainStatus(domain);
                return (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {domain.domain}
                          </span>
                          {domain.isPrimary && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0">
                              <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                              Primary
                            </Badge>
                          )}
                          <Badge variant="outline" className={`${status.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        {domain.isVerified && domain.isActive && (
                          <div className="flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            <a
                              href={`https://${domain.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-blue-600 hover:underline"
                            >
                              Visit Store
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!domain.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={verifying[domain.id]}
                          className="text-xs"
                        >
                          {verifying[domain.id] ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verify
                            </>
                          )}
                        </Button>
                      )}

                      {domain.isVerified && !domain.isPrimary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetPrimary(domain.id)}
                          className="text-xs"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Set Primary
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDomain(domain);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator className="my-4" />

          <button
            onClick={() => setDnsInstructionsOpen(true)}
            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Info className="w-3.5 h-3.5" />
            How to configure DNS for custom domains
          </button>
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Add Custom Domain
            </DialogTitle>
            <DialogDescription className="text-xs">
              Connect your own domain to make your store accessible at a custom URL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-sm">
                Domain Name
              </Label>
              <Input
                id="domain"
                placeholder="store.yourdomain.com or yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                Enter your domain without http:// or https://
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-medium">After adding:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-1">
                    <li>Configure DNS CNAME record</li>
                    <li>Wait for DNS propagation (5-30 minutes)</li>
                    <li>Click "Verify" to activate</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
              {adding ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS Instructions Dialog */}
      <Dialog open={dnsInstructionsOpen} onOpenChange={setDnsInstructionsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              DNS Configuration Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these steps to connect your custom domain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  1
                </div>
                <h3 className="text-sm font-semibold">Add CNAME Record</h3>
              </div>
              <p className="text-xs text-gray-600 ml-8">
                Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add a CNAME record:
              </p>
              <div className="ml-8 mt-2 space-y-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Type</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">CNAME</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Name / Host</p>
                    <p className="text-sm font-mono text-gray-900">
                      @ <span className="text-xs text-gray-500">(for root domain)</span> or{' '}
                      <span className="font-semibold">store</span>{' '}
                      <span className="text-xs text-gray-500">(for subdomain)</span>
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Value / Points To</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(CNAME_TARGET)}
                        className="h-6 px-2 text-xs"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono font-semibold text-blue-600">{CNAME_TARGET}</p>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">TTL</p>
                    <p className="text-sm font-mono text-gray-900">
                      3600 <span className="text-xs text-gray-500">(or Auto)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  2
                </div>
                <h3 className="text-sm font-semibold">Wait for DNS Propagation</h3>
              </div>
              <p className="text-xs text-gray-600 ml-8">
                DNS changes can take 5-30 minutes to propagate globally. Some registrars are faster than others.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  3
                </div>
                <h3 className="text-sm font-semibold">Verify Domain</h3>
              </div>
              <p className="text-xs text-gray-600 ml-8">
                After DNS propagation, click the "Verify" button next to your domain. We'll check the DNS record and
                activate your custom domain.
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  ✓
                </div>
                <h3 className="text-sm font-semibold">SSL Certificate</h3>
              </div>
              <p className="text-xs text-gray-600 ml-8">
                SSL certificates are automatically provisioned after verification. Your custom domain will be accessible
                via HTTPS within a few minutes.
              </p>
            </div>

            {/* Common Issues */}
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 mt-4">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Common Issues</h4>
              <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                <li>DNS changes can take up to 48 hours in rare cases</li>
                <li>Remove any existing A records for the same hostname</li>
                <li>Some registrars don't support CNAME on root domains (@)</li>
                <li>Use a subdomain like store.yourdomain.com if root doesn't work</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDnsInstructionsOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Custom Domain?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <p>
                Are you sure you want to remove <span className="font-semibold">{selectedDomain?.domain}</span>?
              </p>
              <p>Your store will no longer be accessible at this domain. Customers visiting this URL will see an error.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveDomain} className="bg-red-600 hover:bg-red-700">
              Remove Domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
