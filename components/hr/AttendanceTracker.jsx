'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, ChevronLeft, ChevronRight, Check, X, Clock,
    Sun, Users, AlertTriangle, Palmtree, UserCheck, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_TYPES = {
    present: { label: 'Present', icon: '[OK]', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    absent: { label: 'Absent', icon: '[X]', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    halfday: { label: 'Half Day', icon: '[PARTIAL]', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    leave: { label: 'On Leave', icon: '[LEAVE]', color: 'bg-brand-50 text-brand-primary border-brand-100', dot: 'bg-brand-primary' },
    holiday: { label: 'Holiday', icon: '[CELEBRATION]', color: 'bg-wine-100 text-wine-700 border-wine-200', dot: 'bg-wine-500' },
};

const DEMO_EMPLOYEES = [
    { id: 'e1', name: 'Ahmed Khan', role: 'Manager', department: 'Operations' },
    { id: 'e2', name: 'Sara Ali', role: 'Cashier', department: 'Sales' },
    { id: 'e3', name: 'Usman Iqbal', role: 'Chef', department: 'Kitchen' },
    { id: 'e4', name: 'Fatima Noor', role: 'Waiter', department: 'Service' },
    { id: 'e5', name: 'Hassan Raza', role: 'Accountant', department: 'Finance' },
];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function generateDemoAttendance(employees, year, month) {
    const data = {};
    const daysInMonth = getDaysInMonth(year, month);

    employees.forEach(emp => {
        data[emp.id] = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const day = date.getDay();
            if (day === 0) {
                data[emp.id][d] = 'holiday'; // Sunday
            } else {
                const rand = Math.random();
                if (rand < 0.75) data[emp.id][d] = 'present';
                else if (rand < 0.85) data[emp.id][d] = 'halfday';
                else if (rand < 0.92) data[emp.id][d] = 'leave';
                else data[emp.id][d] = 'absent';
            }
        }
    });
    return data;
}

export function AttendanceTracker({ businessId, employees: propEmployees = [] }) {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [bulkDate, setBulkDate] = useState(null);

    const employees = propEmployees.length > 0 ? propEmployees : DEMO_EMPLOYEES;
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    const [attendance, setAttendance] = useState(() =>
        generateDemoAttendance(employees, currentYear, currentMonth)
    );

    const navigateMonth = (dir) => {
        const newDate = new Date(currentYear, currentMonth + dir, 1);
        setCurrentMonth(newDate.getMonth());
        setCurrentYear(newDate.getFullYear());
        setAttendance(generateDemoAttendance(employees, newDate.getFullYear(), newDate.getMonth()));
    };

    const cycleStatus = (empId, day) => {
        const statuses = Object.keys(STATUS_TYPES);
        const current = attendance[empId]?.[day] || 'present';
        const nextIdx = (statuses.indexOf(current) + 1) % statuses.length;
        setAttendance(prev => ({
            ...prev,
            [empId]: { ...prev[empId], [day]: statuses[nextIdx] }
        }));
    };

    const markBulk = (day, status) => {
        setAttendance(prev => {
            const updated = { ...prev };
            employees.forEach(emp => {
                updated[emp.id] = { ...updated[emp.id], [day]: status };
            });
            return updated;
        });
        setBulkDate(null);
    };

    // Summary stats
    const monthSummary = useMemo(() => {
        const summary = {};
        employees.forEach(emp => {
            const empData = attendance[emp.id] || {};
            summary[emp.id] = {
                present: Object.values(empData).filter(s => s === 'present').length,
                absent: Object.values(empData).filter(s => s === 'absent').length,
                halfday: Object.values(empData).filter(s => s === 'halfday').length,
                leave: Object.values(empData).filter(s => s === 'leave').length,
            };
        });
        return summary;
    }, [attendance, employees]);

    const monthName = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateMonth(-1)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-lg font-black text-gray-900 min-w-[180px] text-center">{monthName}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateMonth(1)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    {Object.entries(STATUS_TYPES).map(([key, { icon, label }]) => (
                        <div key={key} className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{icon}</span>
                            <span className="hidden md:inline">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Days', value: daysInMonth, icon: Calendar, c: 'text-gray-600 bg-gray-50' },
                    { label: 'Avg. Attendance', value: `${Math.round(employees.reduce((s, emp) => s + (monthSummary[emp.id]?.present || 0), 0) / employees.length)}d`, icon: UserCheck, c: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Leave Days', value: employees.reduce((s, emp) => s + (monthSummary[emp.id]?.leave || 0), 0), icon: Palmtree, c: 'text-brand-primary bg-brand-50' },
                    { label: 'Absences', value: employees.reduce((s, emp) => s + (monthSummary[emp.id]?.absent || 0), 0), icon: AlertTriangle, c: 'text-red-600 bg-red-50' },
                ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        <div className={cn('p-2 rounded-lg', stat.c)}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-gray-900">{stat.value}</p>
                            <p className="text-[11px] text-gray-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <Card className="border-none shadow-sm overflow-x-auto">
                <CardContent className="p-0">
                    <table className="w-full text-xs min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left p-3 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[150px]">Employee</th>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const date = new Date(currentYear, currentMonth, i + 1);
                                    const day = date.getDay();
                                    const isToday = i + 1 === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                    return (
                                        <th key={i} className={cn(
                                            'p-1.5 text-center font-bold min-w-[32px]',
                                            day === 0 ? 'text-red-400 bg-red-50/30' : 'text-gray-500',
                                            isToday && 'bg-brand-50'
                                        )}>
                                            <div className="text-[10px]">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][day]}</div>
                                            <div className={cn(isToday && 'bg-brand-primary text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto')}>
                                                {i + 1}
                                            </div>
                                        </th>
                                    );
                                })}
                                <th className="p-2 text-center font-bold text-gray-600 min-w-[60px]">Present</th>
                                <th className="p-2 text-center font-bold text-gray-600 min-w-[60px]">Absent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="p-2.5 sticky left-0 bg-white z-10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-primary flex items-center justify-center text-[10px] font-black">
                                                {emp.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{emp.name}</p>
                                                <p className="text-[10px] text-gray-400">{emp.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const status = attendance[emp.id]?.[day] || 'present';
                                        const cfg = STATUS_TYPES[status];
                                        return (
                                            <td key={i} className="p-0.5 text-center">
                                                <button
                                                    onClick={() => cycleStatus(emp.id, day)}
                                                    className={cn(
                                                        'w-7 h-7 rounded-md flex items-center justify-center text-[10px] transition-all hover:ring-2 hover:ring-brand-100',
                                                        cfg.color, 'border'
                                                    )}
                                                    title={`${cfg.label} -- Click to change`}
                                                >
                                                    {cfg.icon}
                                                </button>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 text-center font-bold text-emerald-600">{monthSummary[emp.id]?.present || 0}</td>
                                    <td className="p-2 text-center font-bold text-red-500">{monthSummary[emp.id]?.absent || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

