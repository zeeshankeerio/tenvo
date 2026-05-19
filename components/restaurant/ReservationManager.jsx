'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, Users, Phone, Plus, ChevronLeft, ChevronRight,
    CalendarDays, LayoutGrid, Check, X, AlertCircle, Armchair,
    Search, Filter, MoreHorizontal, Edit2, Trash2, PhoneCall
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const TIME_SLOTS = [];
for (let h = 11; h <= 22; h++) {
    TIME_SLOTS.push(`${h}:00`);
    TIME_SLOTS.push(`${h}:30`);
}

const STATUS_CONFIG = {
    confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    seated: { label: 'Seated', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' },
    noshow: { label: 'No Show', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

const DEMO_RESERVATIONS = [
    { id: 'r1', customerName: 'Ahmed Khan', phone: '+92-300-1234567', partySize: 4, tableId: '1', date: new Date().toISOString().split('T')[0], time: '19:00', duration: 90, status: 'confirmed', notes: 'Birthday celebration' },
    { id: 'r2', customerName: 'Sara Ali', phone: '+92-321-7654321', partySize: 2, tableId: '2', date: new Date().toISOString().split('T')[0], time: '20:00', duration: 60, status: 'pending', notes: '' },
    { id: 'r3', customerName: 'Usman Iqbal', phone: '+92-333-9876543', partySize: 6, tableId: '3', date: new Date().toISOString().split('T')[0], time: '13:00', duration: 120, status: 'seated', notes: 'VIP guest' },
    { id: 'r4', customerName: 'Fatima Noor', phone: '+92-345-1112233', partySize: 3, tableId: '4', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '19:30', duration: 90, status: 'confirmed', notes: 'Allergic to nuts' },
];

function formatDate(date) {
    return new Intl.DateTimeFormat('en-PK', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function getWeekDays(baseDate) {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
}

export function ReservationManager({ businessId, tables = [], onSave }) {
    const [reservations, setReservations] = useState(DEMO_RESERVATIONS);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('day'); // 'day' | 'week'
    const [showDialog, setShowDialog] = useState(false);
    const [editingReservation, setEditingReservation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [formData, setFormData] = useState({
        customerName: '', phone: '', partySize: 2, tableId: '',
        date: '', time: '19:00', duration: 90, notes: ''
    });

    const displayTables = tables.length > 0 ? tables : [
        { id: '1', name: 'Table 1', capacity: 4 },
        { id: '2', name: 'Table 2', capacity: 2 },
        { id: '3', name: 'Table 3', capacity: 6 },
        { id: '4', name: 'Table 4', capacity: 4 },
        { id: '5', name: 'Table 5', capacity: 8 },
    ];

    const dateStr = selectedDate.toISOString().split('T')[0];

    const filteredReservations = useMemo(() => {
        let filtered = reservations;
        if (viewMode === 'day') {
            filtered = filtered.filter(r => r.date === dateStr);
        }
        if (filterStatus !== 'all') {
            filtered = filtered.filter(r => r.status === filterStatus);
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.customerName.toLowerCase().includes(q) ||
                r.phone.includes(q)
            );
        }
        return filtered;
    }, [reservations, dateStr, viewMode, filterStatus, searchTerm]);

    // Check for conflicts
    const hasConflict = (tableId, date, time, duration, excludeId = null) => {
        const newStart = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
        const newEnd = newStart + duration;

        return reservations.some(r => {
            if (r.id === excludeId) return false;
            if (r.tableId !== tableId || r.date !== date) return false;
            if (r.status === 'cancelled' || r.status === 'noshow') return false;

            const rStart = parseInt(r.time.split(':')[0]) * 60 + parseInt(r.time.split(':')[1]);
            const rEnd = rStart + r.duration;
            return newStart < rEnd && newEnd > rStart;
        });
    };

    const openNewDialog = () => {
        setEditingReservation(null);
        setFormData({
            customerName: '', phone: '', partySize: 2, tableId: displayTables[0]?.id || '',
            date: dateStr, time: '19:00', duration: 90, notes: ''
        });
        setShowDialog(true);
    };

    const openEditDialog = (res) => {
        setEditingReservation(res);
        setFormData({
            customerName: res.customerName, phone: res.phone, partySize: res.partySize,
            tableId: res.tableId, date: res.date, time: res.time,
            duration: res.duration, notes: res.notes
        });
        setShowDialog(true);
    };

    const handleSave = () => {
        if (!formData.customerName || !formData.phone || !formData.tableId) return;

        const conflict = hasConflict(formData.tableId, formData.date, formData.time, formData.duration, editingReservation?.id);
        if (conflict) {
            alert('This table is already booked at the selected time. Please choose another slot.');
            return;
        }

        if (editingReservation) {
            setReservations(prev => prev.map(r =>
                r.id === editingReservation.id ? { ...r, ...formData } : r
            ));
        } else {
            const newRes = {
                id: `r-${Date.now()}`,
                ...formData,
                status: 'confirmed'
            };
            setReservations(prev => [...prev, newRes]);
        }
        setShowDialog(false);
    };

    const updateStatus = (id, newStatus) => {
        setReservations(prev => prev.map(r =>
            r.id === id ? { ...r, status: newStatus } : r
        ));
    };

    const deleteReservation = (id) => {
        setReservations(prev => prev.filter(r => r.id !== id));
    };

    const navigateDate = (direction) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (viewMode === 'week' ? 7 * direction : direction));
        setSelectedDate(d);
    };

    // Day View -- Time Slots × Tables Grid
    const renderDayView = () => {
        const dayRes = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled' && r.status !== 'noshow');

        return (
            <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                    {/* Header */}
                    <div className="grid gap-0 border-b border-gray-200" style={{ gridTemplateColumns: `80px repeat(${displayTables.length}, 1fr)` }}>
                        <div className="p-2 bg-gray-50 text-xs font-bold text-gray-500">TIME</div>
                        {displayTables.map(t => (
                            <div key={t.id} className="p-2 bg-gray-50 text-xs font-bold text-gray-700 text-center border-l border-gray-200">
                                {t.name}
                                <span className="text-gray-400 ml-1">({t.capacity}p)</span>
                            </div>
                        ))}
                    </div>

                    {/* Time slots */}
                    {TIME_SLOTS.filter((_, i) => i % 2 === 0).map(slot => {
                        const slotHour = parseInt(slot.split(':')[0]);
                        return (
                            <div
                                key={slot}
                                className="grid gap-0 border-b border-gray-100 hover:bg-gray-50/50"
                                style={{ gridTemplateColumns: `80px repeat(${displayTables.length}, 1fr)` }}
                            >
                                <div className="p-2 text-xs text-gray-400 font-medium">{slot}</div>
                                {displayTables.map(table => {
                                    const booking = dayRes.find(r => {
                                        const rHour = parseInt(r.time.split(':')[0]);
                                        return r.tableId === table.id && rHour === slotHour;
                                    });

                                    return (
                                        <div key={table.id} className="p-1 border-l border-gray-100 min-h-[48px]">
                                            {booking && (
                                                <button
                                                    onClick={() => openEditDialog(booking)}
                                                    className={cn(
                                                        'w-full text-left p-1.5 rounded-lg text-[11px] font-medium border transition-all hover:shadow-sm',
                                                        STATUS_CONFIG[booking.status]?.color
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[booking.status]?.dot)} />
                                                        <span className="truncate">{booking.customerName}</span>
                                                    </div>
                                                    <div className="text-[10px] opacity-70 mt-0.5">
                                                        {booking.time} · {booking.partySize}p
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Week View -- 7-day density bar
    const renderWeekView = () => {
        const weekDays = getWeekDays(selectedDate);
        const today = new Date().toISOString().split('T')[0];

        return (
            <div className="space-y-2">
                {weekDays.map(day => {
                    const dayStr = day.toISOString().split('T')[0];
                    const dayReservations = reservations.filter(r => r.date === dayStr && r.status !== 'cancelled');
                    const isToday = dayStr === today;

                    return (
                        <button
                            key={dayStr}
                            onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                            className={cn(
                                'w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left hover:shadow-md',
                                isToday ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-white border border-gray-100 hover:border-gray-200'
                            )}
                        >
                            <div className={cn(
                                'w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0',
                                isToday ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'
                            )}>
                                <span className="text-[10px] font-bold uppercase">
                                    {new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day)}
                                </span>
                                <span className="text-lg font-black">{day.getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-800">
                                        {dayReservations.length} Reservation{dayReservations.length !== 1 ? 's' : ''}
                                    </span>
                                    {dayReservations.length > 0 && (
                                        <span className="text-xs text-gray-400">
                                            {dayReservations.reduce((s, r) => s + r.partySize, 0)} guests
                                        </span>
                                    )}
                                </div>
                                {/* Density bar */}
                                <div className="flex gap-1 mt-2">
                                    {TIME_SLOTS.filter((_, i) => i % 2 === 0).map(slot => {
                                        const slotH = parseInt(slot.split(':')[0]);
                                        const hasBooking = dayReservations.some(r => parseInt(r.time.split(':')[0]) === slotH);
                                        return (
                                            <div
                                                key={slot}
                                                className={cn(
                                                    'h-2 flex-1 rounded-full',
                                                    hasBooking ? 'bg-indigo-400' : 'bg-gray-100'
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    // Summary stats
    const todayReservations = reservations.filter(r => r.date === dateStr);
    const confirmedCount = todayReservations.filter(r => r.status === 'confirmed').length;
    const pendingCount = todayReservations.filter(r => r.status === 'pending').length;
    const seatedCount = todayReservations.filter(r => r.status === 'seated').length;
    const totalGuests = todayReservations.filter(r => r.status !== 'cancelled' && r.status !== 'noshow')
        .reduce((s, r) => s + r.partySize, 0);

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Guests', value: totalGuests, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Confirmed', value: confirmedCount, icon: Check, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Seated', value: seatedCount, icon: Armchair, color: 'text-blue-600 bg-blue-50' },
                ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <div className={cn('p-2 rounded-lg', stat.color)}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-gray-900">{stat.value}</p>
                            <p className="text-[11px] text-gray-400 font-medium">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('day')}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            viewMode === 'day' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />Day
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <LayoutGrid className="w-3.5 h-3.5 inline mr-1.5" />Week
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateDate(-1)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-bold text-gray-700 min-w-[140px] text-center">
                        {viewMode === 'day' ? formatDate(selectedDate) : `Week of ${formatDate(getWeekDays(selectedDate)[0])}`}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateDate(1)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg" onClick={() => setSelectedDate(new Date())}>
                        Today
                    </Button>
                </div>

                <div className="flex-1" />

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search guests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-8 w-48 text-xs rounded-lg"
                    />
                </div>

                <Button onClick={openNewDialog} className="h-8 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    New Booking
                </Button>
            </div>

            {/* Main Content */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    {viewMode === 'day' ? renderDayView() : renderWeekView()}
                </CardContent>
            </Card>

            {/* Upcoming Reservations List (Day View) */}
            {viewMode === 'day' && filteredReservations.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                        {formatDate(selectedDate)} -- {filteredReservations.length} Booking{filteredReservations.length !== 1 ? 's' : ''}
                    </h4>
                    {filteredReservations.map(res => {
                        const cfg = STATUS_CONFIG[res.status];
                        const table = displayTables.find(t => t.id === res.tableId);
                        return (
                            <motion.div
                                key={res.id}
                                layout
                                className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                            >
                                <div className={cn('w-1.5 h-12 rounded-full', cfg.dot)} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900">{res.customerName}</span>
                                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.color)}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{res.time}</span>
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{res.partySize} guests</span>
                                        <span className="flex items-center gap-1"><Armchair className="w-3 h-3" />{table?.name || 'Unassigned'}</span>
                                        {res.notes && <span className="text-gray-300">· {res.notes}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {res.status === 'confirmed' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-blue-500 hover:bg-blue-50" onClick={() => updateStatus(res.id, 'seated')}>
                                            <Armchair className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                    {res.status === 'pending' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-emerald-500 hover:bg-emerald-50" onClick={() => updateStatus(res.id, 'confirmed')}>
                                            <Check className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-gray-400 hover:bg-gray-50" onClick={() => openEditDialog(res)}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400 hover:bg-red-50" onClick={() => updateStatus(res.id, 'cancelled')}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Booking Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">
                            {editingReservation ? 'Edit Reservation' : 'New Reservation'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingReservation ? 'Update the booking details below.' : 'Fill in the details to create a new booking.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Guest Name *</Label>
                                <Input
                                    value={formData.customerName}
                                    onChange={(e) => setFormData(p => ({ ...p, customerName: e.target.value }))}
                                    placeholder="Ahmed Khan"
                                    className="mt-1 h-9 text-sm rounded-lg"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Phone *</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="+92-300-1234567"
                                    className="mt-1 h-9 text-sm rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                                    className="mt-1 h-9 text-sm rounded-lg"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Time</Label>
                                <select
                                    value={formData.time}
                                    onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))}
                                    className="mt-1 w-full h-9 text-sm rounded-lg border border-gray-200 px-2"
                                >
                                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Party Size</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={formData.partySize}
                                    onChange={(e) => setFormData(p => ({ ...p, partySize: parseInt(e.target.value) || 1 }))}
                                    className="mt-1 h-9 text-sm rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Table</Label>
                                <select
                                    value={formData.tableId}
                                    onChange={(e) => setFormData(p => ({ ...p, tableId: e.target.value }))}
                                    className="mt-1 w-full h-9 text-sm rounded-lg border border-gray-200 px-2"
                                >
                                    {displayTables.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.capacity} seats)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-600">Duration (min)</Label>
                                <select
                                    value={formData.duration}
                                    onChange={(e) => setFormData(p => ({ ...p, duration: parseInt(e.target.value) }))}
                                    className="mt-1 w-full h-9 text-sm rounded-lg border border-gray-200 px-2"
                                >
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                    <option value={120}>2 hours</option>
                                    <option value={180}>3 hours</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-gray-600">Special Notes</Label>
                            <Input
                                value={formData.notes}
                                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Allergies, celebrations, preferences..."
                                className="mt-1 h-9 text-sm rounded-lg"
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-lg text-xs font-bold">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                            {editingReservation ? 'Update Booking' : 'Create Booking'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
