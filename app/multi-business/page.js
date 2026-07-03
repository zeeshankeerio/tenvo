'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { businessAPI } from '@/lib/api/business';
import { getPlatformAccessStatus } from '@/lib/actions/admin/platform';
import {
  Building2,
  Store,
  Plus,
  Settings,
  BarChart3,
  Package,
  Users,
  Eye,
  Loader2,
  Factory,
  Globe,
  Briefcase,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Shield,
  Zap,
  LayoutGrid,
  Search,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function MultiBusinessPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    async function fetchBusinesses() {
      if (!user) return;
      try {
        const fetched = await businessAPI.getByUserId(user.id);
        setBusinesses(fetched || []);
      } catch (error) {
        console.error('Failed to load businesses:', error);
        toast.error('Could not load your businesses');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchBusinesses();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Platform owner / admin detection is server-authoritative (email allowlist +
  // BetterAuth role are not in the client bundle).
  useEffect(() => {
    let active = true;
    if (!authLoading && user) {
      getPlatformAccessStatus()
        .then((status) => {
          if (active) setIsPlatformAdmin(Boolean(status?.isPlatformAdmin));
        })
        .catch(() => {
          if (active) setIsPlatformAdmin(false);
        });
    }
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const handleEnterBusiness = (domain) => {
    router.push(`/business/${domain}`);
  };
  
  const filteredBusinesses = businesses.filter(biz => 
    biz.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    biz.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    biz.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-wine" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing Cloud Entities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <TenvoTextLogo />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                  Enterprise Hub
                  <span className="hidden sm:inline w-1 h-1 rounded-full bg-gray-300" />
                  <span className="hidden sm:inline text-xs font-bold text-gray-400 lowercase tracking-normal">Switch Entity</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isPlatformAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin')}
                    className="border-wine/30 text-wine hover:bg-wine/5 font-semibold rounded-xl px-4 py-5 text-xs uppercase tracking-widest"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Control Panel</span>
                    <span className="sm:hidden">Admin</span>
                  </Button>
                  <div className="w-px h-6 bg-gray-100 mx-2" />
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 rounded-xl"
              >
                Public Home
              </Button>
              <div className="w-px h-6 bg-gray-100 mx-2" />
              <Button
                onClick={() => router.push('/register')}
                className="bg-wine hover:bg-wine/90 text-white font-semibold rounded-xl px-6 py-5 shadow-lg shadow-wine/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                <Plus className="w-4 h-4 mr-2" />
                Launch New Entity
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wine/5 border border-wine/10 text-wine text-[10px] font-semibold uppercase tracking-widest mb-4 shadow-sm">
            <ShieldCheck className="w-3 h-3" />
            Global Executive Controls
          </div>
          <h2 className="text-4xl font-semibold text-gray-900 tracking-tighter">
            Choose Your <span className="text-wine">Operational Domain</span>
          </h2>
          <p className="text-gray-500 font-medium max-w-2xl">
            You have access to <strong>{businesses.length}</strong> active legal entities. Every workspace is isolated with dedicated compliance, inventory, and financial ledger data.
          </p>
        </div>

        {/* Businesses Hub & Filters */}
        <div className="mt-8">
          {businesses.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">No entities found</h3>
              <p className="text-gray-500 font-medium mb-8 max-w-xs mx-auto">Click below to initialize your first enterprise business domain.</p>
              <Button
                onClick={() => router.push('/register')}
                className="bg-wine hover:bg-wine/90 text-white font-semibold h-14 px-10 rounded-2xl shadow-xl shadow-wine/20"
              >
                <Plus className="w-5 h-5 mr-3" />
                Launch First Entity
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Interactive Filter & View Controls */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/60 backdrop-blur-sm p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                {/* Search Bar */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search entity name, domain or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 h-12 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-wine transition-all shadow-inner"
                  />
                </div>

                {/* View Toggles & Details */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="hidden md:inline text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                    {filteredBusinesses.length} of {businesses.length} Hubs
                  </span>
                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200/50 shadow-sm">
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Compact Grid"
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'grid' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      title="Sleek List View"
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'list' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Business Selectors List/Grid */}
              {filteredBusinesses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">No matching entities found</h3>
                  <p className="text-xs text-gray-500 font-semibold mb-6 max-w-xs mx-auto">Try refining your search query or launch a new entity instead.</p>
                  <Button
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    className="rounded-xl px-6 text-xs uppercase font-semibold tracking-wider"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                /* COMPACT GRID VIEW */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBusinesses.map((biz, idx) => (
                    <div
                      key={biz.id}
                      onClick={() => handleEnterBusiness(biz.domain)}
                      className="group cursor-pointer bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.15)] hover:border-wine/40 active:scale-[0.99] transition-all duration-350 overflow-hidden relative flex flex-col justify-between h-full animate-in fade-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {/* Top row */}
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-11 h-11 bg-wine/5 rounded-2xl flex items-center justify-center text-wine shadow-inner group-hover:scale-105 transition-transform duration-300">
                            {biz.category === 'retail-shop' ? <Store className="w-5.5 h-5.5" /> :
                              biz.category === 'manufacturing' ? <Factory className="w-5.5 h-5.5" /> :
                                biz.category === 'ecommerce' ? <Globe className="w-5.5 h-5.5" /> :
                                  <Briefcase className="w-5.5 h-5.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate group-hover:text-wine transition-colors">
                              {biz.business_name}
                            </h3>
                            <p className="text-[9px] text-wine font-semibold uppercase tracking-widest mt-1 opacity-70 truncate">
                              {biz.domain?.replace(/-/g, ' ')}
                            </p>
                          </div>
                        </div>

                        {/* Mid Row Base and Authority badges */}
                        <div className="grid grid-cols-2 gap-3 mt-5">
                          <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Global Base</p>
                            <p className="font-bold text-gray-800 text-xs truncate">{biz.city || 'Karachi, PK'}</p>
                          </div>
                          <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Authority</p>
                            <p className="font-bold text-gray-800 text-xs truncate uppercase">{biz.user_role || 'Executive'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom sync status and click trigger */}
                      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-semibold text-emerald-700 uppercase tracking-widest">Active Sync</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-950 group-hover:text-wine transition-colors flex items-center gap-1">
                          Enter Workplace
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* SLEEK LIST VIEW */
                <div className="space-y-3">
                  {filteredBusinesses.map((biz, idx) => (
                    <div
                      key={biz.id}
                      onClick={() => handleEnterBusiness(biz.domain)}
                      className="group cursor-pointer bg-white rounded-2xl border border-slate-200 p-4 hover:border-wine/40 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-wine/5 rounded-xl flex items-center justify-center text-wine group-hover:scale-105 transition-transform flex-shrink-0">
                          {biz.category === 'retail-shop' ? <Store className="w-5 h-5" /> :
                            biz.category === 'manufacturing' ? <Factory className="w-5 h-5" /> :
                              biz.category === 'ecommerce' ? <Globe className="w-5 h-5" /> :
                                <Briefcase className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight group-hover:text-wine transition-colors truncate">
                            {biz.business_name}
                          </h3>
                          <p className="text-[9px] text-wine font-semibold uppercase tracking-widest mt-1 opacity-70 truncate">
                            {biz.domain?.replace(/-/g, ' ')}
                          </p>
                        </div>
                      </div>

                      {/* Info badges */}
                      <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100/50 flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Base:</span>
                          <span className="font-bold text-gray-800 text-xs">{biz.city || 'Karachi, PK'}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100/50 flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Role:</span>
                          <span className="font-bold text-gray-800 text-xs uppercase">{biz.user_role || 'Executive'}</span>
                        </div>
                      </div>

                      {/* Status and Action */}
                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-semibold text-emerald-700 uppercase tracking-widest">Active Sync</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-950 group-hover:text-wine transition-colors flex items-center gap-1">
                          Enter Workplace
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Overview Banner */}
        <div className="mt-20 relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 p-8 sm:p-12 shadow-[0_34px_90px_-46px_rgba(15,23,42,0.42)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-wine/5 rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-wine rounded-2xl flex items-center justify-center text-white shadow-lg shadow-wine/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-semibold text-gray-900 tracking-tighter">
                One Platform.<br />
                <span className="text-wine">Infinite Business Potential.</span>
              </h2>
              <p className="text-gray-500 font-medium">
                The Tenvo Enterprise API ensures that your inventory, sales, and accounting data remains perfectly isolated per entity while allowing you as an owner to maintain global oversight.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600 uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4" />
                  Real-time Ledger
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-600 uppercase tracking-widest">
                  <Zap className="w-4 h-4" />
                  Domain Adaptive UI
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-wine/5 rounded-3xl border border-wine/10 space-y-2">
                <LayoutGrid className="w-6 h-6 text-wine opacity-40" />
                <p className="text-xl font-semibold text-wine leading-none">Unlimited</p>
                <p className="text-[10px] font-semibold text-wine/60 uppercase tracking-widest">Domains</p>
              </div>
              <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-2">
                <Users className="w-6 h-6 text-zinc-400" />
                <p className="text-xl font-semibold text-zinc-800 leading-none">Unified</p>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Legal Team</p>
              </div>
              <div className="col-span-2 p-6 bg-zinc-900 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white uppercase tracking-widest">Global Security</p>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  Advanced RLS (Row Level Security) ensures that your financial sensitive data never leaks across business domains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
