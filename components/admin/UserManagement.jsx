'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Filter, 
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Shield,
  Activity,
  Eye,
  Ban,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Download,
  RefreshCw,
  UserCog,
  LogIn,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_DESCRIPTIONS } from '@/lib/config/platform';
import { listAllUsers, changeUserRole, setBusinessUserStatus, setPlatformRole } from '@/lib/actions/admin/platform';
import { startImpersonation, listInvitations } from '@/lib/actions/admin/users';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

/**
 * UserManagement - Advanced user directory and management for platform admins
 * 
 * Features:
 * - User directory with advanced filters
 * - Bulk actions (activate, deactivate, delete)
 * - User activity tracking
 * - Secure impersonation for support
 * - Invitation management
 * - Export capabilities
 */

// Data structure now comes from API

const FILTERS = {
  status: ['all', 'active', 'inactive', 'pending'],
  role: ['all', 'owner', 'admin', 'manager', 'accountant', 'cashier', 'salesperson'],
  plan: ['all', 'free', 'starter', 'growth', 'professional', 'business', 'enterprise']
};

/**
 * User Table Component
 */
function UserTable({ users, onView, onEdit, onImpersonate, onDeactivate, selectedUsers, onSelect, isPlatformOwner, onSetPlatformRole }) {
  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 w-10">
              <input 
                type="checkbox" 
                className="rounded border-gray-300"
                checked={selectedUsers.length === users.length}
                onChange={() => onSelect?.(selectedUsers.length === users.length ? [] : users.map(u => u.rowKey))}
              />
            </th>
            <th className="text-left p-3 font-medium text-sm">User</th>
            <th className="text-left p-3 font-medium text-sm">Role & Business</th>
            <th className="text-left p-3 font-medium text-sm">Plan</th>
            <th className="text-left p-3 font-medium text-sm">Status</th>
            <th className="text-left p-3 font-medium text-sm">Last Active</th>
            <th className="text-left p-3 font-medium text-sm">Activity</th>
            {isPlatformOwner && (
              <th className="text-left p-3 font-medium text-sm">Platform Role</th>
            )}
            <th className="text-right p-3 font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.rowKey} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300"
                  checked={selectedUsers.includes(user.rowKey)}
                  onChange={() => {
                    const newSelection = selectedUsers.includes(user.rowKey)
                      ? selectedUsers.filter(id => id !== user.rowKey)
                      : [...selectedUsers, user.rowKey];
                    onSelect?.(newSelection);
                  }}
                />
              </td>
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {user.name?.split(' ').map(n => n[0]).join('') || user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="p-3">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {ROLE_DESCRIPTIONS[user.role]?.label || user.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{user.business}</p>
                </div>
              </td>
              <td className="p-3">
                <Badge 
                  variant="secondary" 
                  className="text-xs capitalize"
                >
                  {user.planTier}
                </Badge>
              </td>
              <td className="p-3">
                <Badge className={cn("text-xs", getStatusColor(user.status))}>
                  {user.status}
                </Badge>
              </td>
              <td className="p-3">
                <p className="text-sm">{formatDate(user.lastActive)}</p>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span>{user.loginCount ?? 0} logins</span>
                </div>
                {(user.featuresUsed?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.featuresUsed.slice(0, 3).map(feature => (
                      <Badge key={feature} variant="outline" className="text-[10px] px-1">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              {isPlatformOwner && (
                <td className="p-3">
                  <Select
                    value={user.platformRole || 'user'}
                    onValueChange={(val) => onSetPlatformRole?.(user.userId, val)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Platform Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              )}
              <td className="p-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView?.(user)}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(user)}
                    title="Edit User"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {user.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onImpersonate?.(user)}
                      title="Impersonate User"
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <LogIn className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeactivate?.(user)}
                    title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                    className={user.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                  >
                    {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * User Detail Panel
 */
function UserDetailPanel({ user, onClose, onImpersonate }) {
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{user.name}</h3>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">{ROLE_DESCRIPTIONS[user.role]?.label || user.role}</Badge>
            <Badge variant="secondary" className="capitalize">{user.planTier} Plan</Badge>
            <Badge className={cn(
              user.status === 'active' ? 'bg-green-100 text-green-700' :
              user.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
              'bg-amber-100 text-amber-700'
            )}>
              {user.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Business</p>
            <p className="font-medium">{user.business}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{user.phone || 'Not provided'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Logins</p>
            <p className="font-medium">{user.loginCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm">Last login</p>
                <p className="text-xs text-muted-foreground">
                  {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm">Features used</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.featuresUsed.map(feature => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={() => onImpersonate?.(user)}
          disabled={user.status !== 'active'}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Impersonate User
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * Bulk Actions Bar
 */
function BulkActionsBar({ selectedCount, onActivate, onDeactivate, onDelete, onExport }) {
  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg"
    >
      <p className="font-medium">
        {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onActivate}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Activate
        </Button>
        <Button variant="outline" size="sm" onClick={onDeactivate}>
          <Ban className="w-4 h-4 mr-2" />
          Deactivate
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Flatten platform user rows (one row per business membership).
 */
function flattenPlatformUsers(apiUsers = []) {
  const rows = [];

  for (const u of apiUsers) {
    const memberships = Array.isArray(u.businesses)
      ? u.businesses.filter(Boolean)
      : [];

    if (memberships.length === 0) {
      rows.push({
        rowKey: u.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        platformRole: u.platform_role || 'user',
        role: u.platform_role || 'user',
        business: 'No business',
        businessDomain: null,
        businessId: null,
        status: 'active',
        planTier: 'free',
        createdAt: u.createdAt,
        lastActive: u.createdAt,
      });
      continue;
    }

    for (const membership of memberships) {
      rows.push({
        rowKey: `${u.id}-${membership.business_id}`,
        userId: u.id,
        name: u.name,
        email: u.email,
        platformRole: u.platform_role || 'user',
        role: membership.role || 'viewer',
        business: membership.business_name || 'Unknown',
        businessDomain: membership.domain || null,
        businessId: membership.business_id,
        status: membership.status || 'active',
        planTier: membership.plan_tier || 'free',
        createdAt: u.createdAt,
        lastActive: u.createdAt,
      });
    }
  }

  return rows;
}

/**
 * Main User Management Component
 */
export function UserManagement({ businessId }) {
  const { isPlatformOwner } = useBusiness();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    plan: 'all'
  });
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listAllUsers({ limit: 1000 });
      
      if (result.success) {
        setUsers(flattenPlatformUsers(result.users));
      } else {
        toast.error(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Apply filters
  useEffect(() => {
    let result = users;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.business?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(u => u.status === filters.status);
    }

    // Role filter
    if (filters.role !== 'all') {
      result = result.filter(u => u.role === filters.role);
    }

    // Plan filter
    if (filters.plan !== 'all') {
      result = result.filter(u => u.planTier === filters.plan);
    }

    setFilteredUsers(result);
  }, [users, searchTerm, filters]);

  const handleImpersonate = async (user) => {
    if (!user.businessId) {
      toast.error('Select a user with an active business membership to start support mode.');
      return;
    }

    if (!confirm(`Start support session for ${user.name}? This records an audit entry (session swap is not enabled).`)) {
      return;
    }
    
    try {
      setIsImpersonating(true);
      const result = await startImpersonation(user.userId, 'Support request', {
        ipAddress: '',
        userAgent: navigator.userAgent
      });
      
      if (result.success) {
        toast.success(`Support session recorded for ${user.name}`);
        const domain = user.businessDomain || 'retail-shop';
        window.location.href = `/business/${domain}`;
      } else {
        toast.error(result.error || 'Failed to start support session');
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error('Failed to start support session');
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleSetPlatformRole = async (userId, newRole) => {
    const res = await setPlatformRole(userId, newRole);
    if (res.success) {
      toast.success(`Platform role updated to ${newRole}`);
      setUsers((prev) =>
        prev.map((row) =>
          row.userId === userId ? { ...row, platformRole: newRole } : row
        )
      );
    } else {
      toast.error(res.error || 'Failed to update platform role');
    }
  };

  const handleDeactivate = async (user) => {
    if (!user.businessId) {
      toast.error('No business membership to update');
      return;
    }

    try {
      const nextStatus = user.status === 'active' ? 'inactive' : 'active';
      const result = await setBusinessUserStatus(user.userId, user.businessId, nextStatus);
      
      if (result.success) {
        setUsers(users.map(u => 
          u.rowKey === user.rowKey ? { ...u, status: nextStatus } : u
        ));
        toast.success(nextStatus === 'inactive' ? 'User deactivated' : 'User activated');
      } else {
        toast.error(result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleBulkActivate = async () => {
    try {
      for (const rowKey of selectedUsers) {
        const user = users.find(u => u.rowKey === rowKey);
        if (user?.businessId) {
          await setBusinessUserStatus(user.userId, user.businessId, 'active');
        }
      }
      
      setUsers(users.map(u => 
        selectedUsers.includes(u.rowKey) ? { ...u, status: 'active' } : u
      ));
      setSelectedUsers([]);
      toast.success('Selected users activated');
    } catch (error) {
      toast.error('Failed to activate some users');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      for (const rowKey of selectedUsers) {
        const user = users.find(u => u.rowKey === rowKey);
        if (user?.businessId) {
          await setBusinessUserStatus(user.userId, user.businessId, 'inactive');
        }
      }
      
      setUsers(users.map(u => 
        selectedUsers.includes(u.rowKey) ? { ...u, status: 'inactive' } : u
      ));
      setSelectedUsers([]);
      toast.success('Selected users deactivated');
    } catch (error) {
      toast.error('Failed to deactivate some users');
    }
  };

  const handleExport = () => {
    const data = selectedUsers.length > 0 
      ? users.filter(u => selectedUsers.includes(u.rowKey))
      : filteredUsers;
    
    const csv = [
      ['Name', 'Email', 'Role', 'Business', 'Status', 'Plan'].join(','),
      ...data.map(u => [u.name, u.email, u.role, u.business, u.status, u.planTier].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h2>
          <p className="text-muted-foreground">
            Manage users, view activity, and provide support
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedUsers.length}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onExport={handleExport}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="cashier">Cashier</option>
              </select>
              
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="professional">Professional</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          <UserTable
            users={filteredUsers}
            selectedUsers={selectedUsers}
            onSelect={setSelectedUsers}
            onView={setSelectedUser}
            onEdit={(user) => console.log('Edit:', user.userId)}
            onImpersonate={handleImpersonate}
            onDeactivate={handleDeactivate}
            isPlatformOwner={isPlatformOwner}
            onSetPlatformRole={handleSetPlatformRole}
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {users.filter(u => u.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {users.filter(u => {
                const lastActive = new Date(u.lastActive);
                const dayAgo = new Date();
                dayAgo.setDate(dayAgo.getDate() - 1);
                return lastActive > dayAgo;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Today</p>
          </CardContent>
        </Card>
      </div>

      {/* User Detail Modal (simplified - would be a Dialog in real implementation) */}
      {selectedUser && (
        <Card className="fixed inset-4 md:inset-auto md:right-4 md:top-4 md:w-96 md:max-h-[calc(100vh-2rem)] overflow-auto z-50 shadow-2xl">
          <CardContent className="p-6">
            <UserDetailPanel
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onImpersonate={handleImpersonate}
            />
          </CardContent>
        </Card>
      )}

      {/* Impersonation Warning */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-2 text-center z-50">
          <p className="font-medium">⚠️ Impersonation Session Active</p>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
