'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Gift, Star, Users, TrendingUp, Plus, Settings,
    ChevronRight, Coins, BadgePercent, Sparkles, Medal, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getLoyaltyProgramsAction, createLoyaltyProgramAction } from '@/lib/actions/standard/loyalty';
import toast from 'react-hot-toast';

// LOYALTY KPI CARDS

function LoyaltyKPI({ label, value, icon: Icon, color }) {
    const colors = {
        gold: 'bg-amber-50 text-amber-600 border-amber-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        purple: 'bg-wine-50 text-wine-600 border-wine-100',
        blue: 'bg-brand-50 text-brand-primary border-brand-100',
    };
    return (
        <div className={cn('rounded-xl border p-4', colors[color])}>
            <Icon className="w-5 h-5 opacity-60 mb-2" />
            <p className="text-2xl font-black tracking-tight">{value}</p>
            <p className="text-[11px] font-semibold opacity-60 mt-1">{label}</p>
        </div>
    );
}

// ===============================================================
// PROGRAM CARD
// ===============================================================

function ProgramCard({ program, currency, onSelect }) {
    const typeIcons = {
        points: Coins,
        tiered: Crown,
        cashback: BadgePercent,
    };
    const Icon = typeIcons[program.type] || Star;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-brand-100 transition-all cursor-pointer group"
            onClick={() => onSelect?.(program)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase',
                    program.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                )}>
                    {program.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            <h3 className="text-sm font-black text-gray-900">{program.name}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{program.description || 'No description'}</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-[9px] font-bold text-gray-400">Earn Rate</p>
                    <p className="text-xs font-black text-gray-800">{program.earn_rate || 1} pts / {currency} 100</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-[9px] font-bold text-gray-400">Redeem Rate</p>
                    <p className="text-xs font-black text-gray-800">{program.redeem_rate || 10} pts = {currency} 1</p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                <span>{program.member_count || 0} members</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </motion.div>
    );
}

// ===============================================================
// CREATE PROGRAM FORM
// ===============================================================

function CreateProgramForm({ businessId, onCreated, onCancel }) {
    const [form, setForm] = useState({
        name: '', description: '', type: 'points',
        earn_rate: 1, redeem_rate: 10,
        min_redeem: 100, expiry_days: 365,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.name) { toast.error('Program name required'); return; }
        setSaving(true);
        try {
            const result = await createLoyaltyProgramAction({
                businessId,
                name: form.name,
                description: form.description,
                type: form.type,
                earnRate: parseFloat(form.earn_rate),
                redeemRate: parseFloat(form.redeem_rate),
                minRedeem: parseInt(form.min_redeem),
                expiryDays: parseInt(form.expiry_days),
            });
            if (result.success) {
                toast.success('Loyalty program created!', { icon: '[CELEBRATION]' });
                onCreated?.();
            } else {
                toast.error(result.error || 'Failed to create program');
            }
        } catch (err) {
            toast.error('Failed to create program');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-gray-900">Create Loyalty Program</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Program Name</label>
                    <input
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. VIP Rewards"
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                    <select
                        value={form.type}
                        onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
                    >
                        <option value="points">Points Based</option>
                        <option value="tiered">Tiered (Bronze/Silver/Gold)</option>
                        <option value="cashback">Cashback</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Description</label>
                <input
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description of the program"
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Earn Rate (per 100)</label>
                    <input type="number" min="0.1" step="0.1" value={form.earn_rate}
                        onChange={e => setForm(p => ({ ...p, earn_rate: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Redeem Rate</label>
                    <input type="number" min="1" value={form.redeem_rate}
                        onChange={e => setForm(p => ({ ...p, redeem_rate: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Min Redeem</label>
                    <input type="number" min="1" value={form.min_redeem}
                        onChange={e => setForm(p => ({ ...p, min_redeem: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Expiry (days)</label>
                    <input type="number" min="30" value={form.expiry_days}
                        onChange={e => setForm(p => ({ ...p, expiry_days: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? 'Creating...' : 'Create Program'}
                </button>
                <button onClick={onCancel} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700">
                    Cancel
                </button>
            </div>
        </motion.div>
    );
}

// ===============================================================
// MAIN LOYALTY MANAGER
// ===============================================================

export function LoyaltyManager({ businessId }) {
    const { business, currencySymbol } = useBusiness();
    const effectiveBusinessId = businessId || business?.id;
    const currency = currencySymbol || 'Rs.';

    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const loadPrograms = useCallback(async () => {
        if (!effectiveBusinessId) return;
        try {
            const result = await getLoyaltyProgramsAction(effectiveBusinessId);
            if (result.success) setPrograms(result.programs || []);
        } catch (err) {
            console.error('[Loyalty] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [effectiveBusinessId]);

    useEffect(() => { loadPrograms(); }, [loadPrograms]);

    const totalMembers = programs.reduce((sum, p) => sum + (p.member_count || 0), 0);
    const activePrograms = programs.filter(p => p.is_active).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Loyalty & Rewards</h2>
                        <p className="text-xs text-gray-400 font-medium">Programs &middot; Points &middot; Customer Retention</p>
                    </div>
                </div>
                {!showCreate && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-amber-200"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Program
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <LoyaltyKPI label="Active Programs" value={activePrograms} icon={Star} color="gold" />
                <LoyaltyKPI label="Total Members" value={totalMembers} icon={Users} color="purple" />
                <LoyaltyKPI label="Programs" value={programs.length} icon={Gift} color="emerald" />
                <LoyaltyKPI label="Avg Retention" value="--" icon={TrendingUp} color="blue" />
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {showCreate && (
                    <CreateProgramForm
                        businessId={effectiveBusinessId}
                        onCreated={() => { setShowCreate(false); loadPrograms(); }}
                        onCancel={() => setShowCreate(false)}
                    />
                )}
            </AnimatePresence>

            {/* Programs Grid */}
            {programs.length === 0 && !showCreate ? (
                <div className="text-center py-16 text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">No loyalty programs yet</p>
                    <p className="text-xs mt-1">Create your first rewards program to boost customer retention</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="mt-4 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600"
                    >
                        Create Program
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {programs.map(program => (
                        <ProgramCard key={program.id} program={program} currency={currency} />
                    ))}
                </div>
            )}
        </div>
    );
}

