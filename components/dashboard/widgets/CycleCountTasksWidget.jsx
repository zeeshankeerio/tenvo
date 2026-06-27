'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList,
  Plus
} from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getCycleCountTasks } from '@/lib/actions/dashboard/widgets';
import toast from 'react-hot-toast';

/**
 * CycleCountTasksWidget
 * 
 * Displays pending cycle count tasks with priority and due dates
 * Shows assigned tasks for current user with progress tracking
 * Includes quick action to start cycle count
 * 
 * Features:
 * - Display pending cycle count tasks
 * - Show task priority and due date
 * - List assigned tasks for current user
 * - Add quick action: "Start Cycle Count" -> opens CycleCountTask
 * - Integrate with existing cycle counting system from Phase 2
 * 
 * Requirements: 6.6, 8.1, 8.2
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {Object} props.data - Cycle count data (optional, will fetch if not provided)
 * @param {Function} props.onStartCycleCount - Callback when user clicks start cycle count (receives scheduleId)
 * @param {Function} props.onViewAllTasks - Callback when user clicks view all tasks
 */
export function CycleCountTasksWidget({ 
  businessId,
  userId,
  data,
  onStartCycleCount,
  onViewAllTasks
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const [cycleCountData, setCycleCountData] = useState(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) {
      setCycleCountData(data);
      setLoading(false);
    } else {
      loadCycleCountTasks();
      
      // Refresh every 5 minutes
      const interval = setInterval(loadCycleCountTasks, 300000);
      return () => clearInterval(interval);
    }
  }, [businessId, userId, data]);

  const loadCycleCountTasks = async () => {
    try {
      setLoading(true);
      
      const result = await getCycleCountTasks(businessId, userId);
      
      if (result.success) {
        setCycleCountData(result.data);
      } else {
        console.error('Failed to load cycle count tasks:', result.error);
        toast.error(result.error || 'Failed to load cycle count tasks');
      }
    } catch (err) {
      console.error('Failed to load cycle count tasks:', err);
      toast.error('Failed to load cycle count tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700'
    };
    return colors[priority] || colors.medium;
  };

  const formatDaysUntil = (date) => {
    const days = Math.ceil((date - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d ${t.overdue || 'overdue'}`;
    if (days === 0) return t.today || 'Today';
    if (days === 1) return t.tomorrow || 'Tomorrow';
    return `${days}d`;
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
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cycleCountData) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-gray-900">
            {t.cycle_count_tasks || 'Cycle Count Tasks'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t.no_cycle_count_tasks || 'No cycle count tasks available'}
            </p>
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
              {t.cycle_count_tasks || 'Cycle Count Tasks'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.pending_cycle_counts || 'Pending cycle counts'}
            </CardDescription>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Task Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
            <div className="text-2xl font-semibold text-yellow-700">
              {cycleCountData.pendingCount}
            </div>
            <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
              {t.pending || 'Pending'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
            <div className="text-2xl font-semibold text-blue-700">
              {cycleCountData.inProgressCount}
            </div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {t.in_progress || 'In Progress'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
            <div className="text-2xl font-semibold text-green-700">
              {cycleCountData.completedToday}
            </div>
            <div className="text-xs font-bold text-green-600 uppercase tracking-wider">
              {t.today || 'Today'}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {cycleCountData.tasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
              onClick={() => onStartCycleCount?.(task.scheduleId)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {task.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {task.productCount} {t.products || 'products'}
                  </div>
                </div>
                <Badge className={`${getPriorityColor(task.priority)} text-[10px] font-bold ml-2`}>
                  {task.priority.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-600">
                    {t.due || 'Due'}: <span className="font-bold">{formatDaysUntil(task.dueDate)}</span>
                  </div>
                </div>
                
                {task.status === 'in_progress' && (
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(task.completedCount / task.productCount) * 100} 
                      className="h-1.5 w-16"
                    />
                    <span className="text-xs font-bold text-gray-600">
                      {Math.round((task.completedCount / task.productCount) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {onViewAllTasks && (
            <button
              onClick={onViewAllTasks}
              className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.view_all_tasks || 'View All Tasks'} →
            </button>
          )}
        </div>

        {/* Last Updated */}
        <div className="text-center text-[10px] text-gray-400">
          {t.last_updated || 'Last updated'}: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
