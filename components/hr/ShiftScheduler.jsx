'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, Clock, ChevronLeft, ChevronRight, Plus, Copy,
    Sun, Moon, Sunset, Printer, Download, Users, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SHIFT_TEMPLATES = [
    { id: 'morning', label: 'Morning', time: '06:00 - 14:00', icon: Sun, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'afternoon', label: 'Afternoon', time: '14:00 - 22:00', icon: Sunset, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'night', label: 'Night', time: '22:00 - 06:00', icon: Moon, color: 'bg-brand-50 text-brand-primary-dark border-brand-100' },
    { id: 'split', label: 'Split', time: '08:00-12:00, 16:00-20:00', icon: Clock, color: 'bg-wine-100 text-wine-700 border-wine-200' },
    { id: 'off', label: 'Day Off', time: 'Rest Day', icon: Calendar, color: 'bg-gray-100 text-gray-500 border-gray-200' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEMO_EMPLOYEES = [
    { id: 'e1', name: 'Ahmed Khan', role: 'Manager', department: 'Operations' },
    { id: 'e2', name: 'Sara Ali', role: 'Cashier', department: 'Sales' },
    { id: 'e3', name: 'Usman Iqbal', role: 'Chef', department: 'Kitchen' },
    { id: 'e4', name: 'Fatima Noor', role: 'Waiter', department: 'Service' },
    { id: 'e5', name: 'Hassan Raza', role: 'Accountant', department: 'Finance' },
];

function getWeekRange(baseDate) {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d);
    return { start, end, label: `${fmt(start)} -- ${fmt(end)}, ${start.getFullYear()}` };
}

function generateDemoSchedule(employees) {
    const schedule = {};
    employees.forEach(emp => {
        schedule[emp.id] = {};
        DAYS.forEach((day, idx) => {
            if (idx === 6) {
                schedule[emp.id][day] = 'off'; // Sunday off
            } else {
                const shifts = ['morning', 'afternoon', 'morning', 'afternoon', 'morning', 'split'];
                schedule[emp.id][day] = shifts[idx % shifts.length];
            }
        });
    });
    return schedule;
}

export function ShiftScheduler({ businessId, employees: propEmployees = [] }) {
    const employees = propEmployees.length > 0 ? propEmployees : DEMO_EMPLOYEES;
    const [baseDate, setBaseDate] = useState(new Date());
    const [schedule, setSchedule] = useState(() => generateDemoSchedule(employees));
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ empId: '', day: '' });

    const weekRange = getWeekRange(baseDate);

    const navigateWeek = (dir) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + 7 * dir);
        setBaseDate(d);
    };

    const openAssign = (empId, day) => {
        setAssignTarget({ empId, day });
        setShowAssignDialog(true);
    };

    const assignShift = (shiftId) => {
        setSchedule(prev => ({
            ...prev,
            [assignTarget.empId]: {
                ...prev[assignTarget.empId],
                [assignTarget.day]: shiftId
            }
        }));
        setShowAssignDialog(false);
    };

    const copyPreviousWeek = () => {
        // In production this would copy from the previous week's saved schedule
        // For demo, just randomize a fresh schedule
        setSchedule(generateDemoSchedule(employees));
    };

    // Conflict detection: same person with night shift followed by morning shift
    const getConflicts = () => {
        const conflicts = [];
        employees.forEach(emp => {
            const empSchedule = schedule[emp.id] || {};
            DAYS.forEach((day, idx) => {
                if (idx > 0) {
                    const prevShift = empSchedule[DAYS[idx - 1]];
                    const currShift = empSchedule[day];
                    if (prevShift === 'night' && currShift === 'morning') {
                        conflicts.push({ empId: emp.id, day, msg: `${emp.name}: Night -> Morning on ${SHORT_DAYS[idx]}` });
                    }
                }
            });
        });
        return conflicts;
    };

    const conflicts = getConflicts();

    // Hours calculation
    const getShiftHours = (shiftId) => {
        switch (shiftId) {
            case 'morning': case 'afternoon': case 'night': return 8;
            case 'split': return 8;
            default: return 0;
        }
    };

    const getEmployeeWeeklyHours = (empId) => {
        const empSchedule = schedule[empId] || {};
        return Object.values(empSchedule).reduce((sum, shift) => sum + getShiftHours(shift), 0);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateWeek(-1)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-sm font-semibold text-gray-900 min-w-[200px] text-center">{weekRange.label}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateWeek(1)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg" onClick={() => setBaseDate(new Date())}>
                        This Week
                    </Button>
                </div>

                <div className="flex-1" />

                {conflicts.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                    </div>
                )}

                <Button variant="outline" className="h-8 text-xs font-bold rounded-lg" onClick={copyPreviousWeek}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Prev. Week
                </Button>
                <Button variant="outline" className="h-8 text-xs font-bold rounded-lg">
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Roster
                </Button>
            </div>

            {/* Shift Legend */}
            <div className="flex gap-2 flex-wrap">
                {SHIFT_TEMPLATES.map(shift => (
                    <div key={shift.id} className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold',
                        shift.color
                    )}>
                        <shift.icon className="w-3 h-3" />
                        <span>{shift.label}</span>
                        <span className="opacity-60 text-[10px] ml-0.5">{shift.time}</span>
                    </div>
                ))}
            </div>

            {/* Schedule Grid */}
            <Card className="border-none shadow-sm overflow-x-auto">
                <CardContent className="p-0">
                    <table className="w-full text-xs min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left p-3 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">Employee</th>
                                {DAYS.map((day, idx) => {
                                    const isSun = idx === 6;
                                    return (
                                        <th key={day} className={cn(
                                            'p-2 text-center font-bold min-w-[100px]',
                                            isSun ? 'text-red-400 bg-red-50/30' : 'text-gray-600'
                                        )}>
                                            {SHORT_DAYS[idx]}
                                        </th>
                                    );
                                })}
                                <th className="p-2 text-center font-bold text-gray-600 min-w-[60px]">Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const weeklyHours = getEmployeeWeeklyHours(emp.id);
                                const isOvertime = weeklyHours > 40;

                                return (
                                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-2.5 sticky left-0 bg-white z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-primary flex items-center justify-center text-[10px] font-semibold">
                                                    {emp.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{emp.name}</p>
                                                    <p className="text-[10px] text-gray-400">{emp.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {DAYS.map(day => {
                                            const shiftId = schedule[emp.id]?.[day] || 'off';
                                            const shift = SHIFT_TEMPLATES.find(s => s.id === shiftId);
                                            const hasConflict = conflicts.some(c => c.empId === emp.id && c.day === day);

                                            return (
                                                <td key={day} className="p-1">
                                                    <button
                                                        onClick={() => openAssign(emp.id, day)}
                                                        className={cn(
                                                            'w-full p-2 rounded-lg border text-xs font-bold transition-all hover:ring-2 hover:ring-brand-100',
                                                            shift?.color || 'bg-gray-50 text-gray-400 border-gray-100',
                                                            hasConflict && 'ring-2 ring-amber-400'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-1 justify-center">
                                                            {shift?.icon && <shift.icon className="w-3 h-3" />}
                                                            <span>{shift?.label || 'Off'}</span>
                                                        </div>
                                                        <div className="text-[10px] opacity-60 mt-0.5">
                                                            {shift?.time}
                                                        </div>
                                                    </button>
                                                </td>
                                            );
                                        })}
                                        <td className="p-2 text-center">
                                            <span className={cn(
                                                'font-semibold text-sm',
                                                isOvertime ? 'text-amber-600' : 'text-gray-700'
                                            )}>
                                                {weeklyHours}h
                                            </span>
                                            {isOvertime && (
                                                <p className="text-[10px] text-amber-500 font-bold">OT</p>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Assign Shift Dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Assign Shift</DialogTitle>
                        <DialogDescription>
                            Select a shift for {employees.find(e => e.id === assignTarget.empId)?.name} on {assignTarget.day}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                        {SHIFT_TEMPLATES.map(shift => (
                            <button
                                key={shift.id}
                                onClick={() => assignShift(shift.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md text-left',
                                    schedule[assignTarget.empId]?.[assignTarget.day] === shift.id
                                        ? 'border-brand-100 bg-brand-50'
                                        : 'border-gray-100 hover:border-gray-200'
                                )}
                            >
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', shift.color)}>
                                    <shift.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{shift.label}</p>
                                    <p className="text-xs text-gray-400">{shift.time}</p>
                                </div>
                                {shift.id !== 'off' && (
                                    <span className="ml-auto text-xs font-bold text-gray-400">{getShiftHours(shift.id)}h</span>
                                )}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

