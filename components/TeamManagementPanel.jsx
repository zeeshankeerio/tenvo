'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, UserPlus, Loader2, Mail, Shield, Key, Clock, Send, XCircle, MoreVertical,
} from 'lucide-react';
import { businessAPI } from '@/lib/api';
import {
  getPendingInvitations,
  resendInvitation,
  cancelInvitation,
  resetTeamMemberPassword,
  updateTeamMemberEmail,
} from '@/lib/actions/admin/teamManagement';
import toast from 'react-hot-toast';

/**
 * Enhanced Team Management Panel
 * Supports invitations, password reset, and email management
 */
export function TeamManagementPanel({ businessId, canManageUsers, canManageBilling, role }) {
  const [team, setTeam] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('salesperson');
  const [teamBusy, setTeamBusy] = useState(false);
  const [invitationsBusy, setInvitationsBusy] = useState(false);

  // Dialogs
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [changeEmailDialog, setChangeEmailDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const isOwner = role === 'owner';
  const activeTeamCount = team.filter(m => m.status === 'active').length;

  const refreshTeam = useCallback(async () => {
    if (!businessId) return;
    try {
      const members = await businessAPI.getUsers(businessId);
      setTeam(members || []);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    }
  }, [businessId]);

  const refreshInvitations = useCallback(async () => {
    if (!businessId) return;
    setInvitationsBusy(true);
    try {
      const result = await getPendingInvitations({ businessId });
      if (result.success) {
        setInvitations(result.invitations || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setInvitationsBusy(false);
    }
  }, [businessId]);

  useEffect(() => {
    refreshTeam();
    refreshInvitations();
  }, [refreshTeam, refreshInvitations]);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !businessId) {
      toast.error('Enter member email first');
      return;
    }

    setTeamBusy(true);
    try {
      await businessAPI.addMember(businessId, inviteEmail.trim(), inviteRole);
      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setInviteRole('salesperson');
      await Promise.all([refreshTeam(), refreshInvitations()]);
    } catch (error) {
      toast.error(error.message || 'Failed to invite member');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRoleUpdate = async (member, nextRole) => {
    if (!businessId || !member?.user_id) return;
    setTeamBusy(true);
    try {
      await businessAPI.updateUserRole(member.user_id, businessId, nextRole);
      toast.success('Role updated');
      await refreshTeam();
    } catch (error) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!businessId || !member?.user_id) return;
    if (!confirm(`Remove ${member.user?.email || 'this member'}?`)) return;
    
    setTeamBusy(true);
    try {
      await businessAPI.removeMember(businessId, member.user_id);
      toast.success('Member removed');
      await refreshTeam();
    } catch (error) {
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setTeamBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setActionBusy(true);
    try {
      const result = await resetTeamMemberPassword({
        businessId,
        targetUserId: selectedMember.user_id,
        newPassword,
      });

      if (result.success) {
        toast.success(result.message || 'Password updated');
        setResetPasswordDialog(false);
        setNewPassword('');
        setSelectedMember(null);
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setActionBusy(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setActionBusy(true);
    try {
      const result = await updateTeamMemberEmail({
        businessId,
        targetUserId: selectedMember.user_id,
        newEmail,
      });

      if (result.success) {
        toast.success(result.message || 'Email updated successfully');
        setChangeEmailDialog(false);
        setNewEmail('');
        setSelectedMember(null);
        await refreshTeam();
      } else {
        toast.error(result.error || 'Failed to update email');
      }
    } catch (error) {
      toast.error('Failed to update email');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResendInvitation = async (invitation) => {
    setInvitationsBusy(true);
    try {
      const result = await resendInvitation({ invitationId: invitation.id });
      if (result.success) {
        toast.success(result.message || 'Invitation resent');
      } else {
        toast.error(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      toast.error('Failed to resend invitation');
    } finally {
      setInvitationsBusy(false);
    }
  };

  const handleCancelInvitation = async (invitation) => {
    if (!confirm(`Cancel invitation to ${invitation.email}?`)) return;
    
    setInvitationsBusy(true);
    try {
      const result = await cancelInvitation({ invitationId: invitation.id });
      if (result.success) {
        toast.success(result.message || 'Invitation cancelled');
        await refreshInvitations();
      } else {
        toast.error(result.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      toast.error('Failed to cancel invitation');
    } finally {
      setInvitationsBusy(false);
    }
  };

  const openResetPasswordDialog = (member) => {
    setSelectedMember(member);
    setNewPassword('');
    setResetPasswordDialog(true);
  };

  const openChangeEmailDialog = (member) => {
    setSelectedMember(member);
    setNewEmail(member.user?.email || '');
    setChangeEmailDialog(true);
  };

  return (
    <>
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white pb-4 pt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 ring-1 ring-slate-200/80">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Team Management
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                Invite members, manage roles, and control access to this workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Access Control Info */}
            <div className="rounded-2xl border border-wine/10 bg-wine/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-wine/70">Access Control</p>
              <p className="mt-1 text-sm font-medium text-gray-700">
                {canManageBilling
                  ? 'You can invite members, assign roles, reset passwords, and manage team access.'
                  : 'You can invite users and manage operational roles. Owner membership and billing remain protected.'}
              </p>
            </div>

            {/* Invite Member Form */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-wine" />
                Invite New Member
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="member@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="md:col-span-2 rounded-xl"
                  disabled={teamBusy}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  disabled={teamBusy}
                  className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleInviteMember}
                  disabled={teamBusy}
                  className="bg-wine hover:bg-wine/90 text-[10px] font-semibold uppercase rounded-xl"
                >
                  {teamBusy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                  Invite
                </Button>
              </div>
            </div>

            {/* Tabs: Active Members & Pending Invitations */}
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
                <TabsTrigger value="members" className="rounded-lg">
                  Active Members ({activeTeamCount})
                </TabsTrigger>
                <TabsTrigger value="invitations" className="rounded-lg">
                  Pending Invitations ({invitations.length})
                </TabsTrigger>
              </TabsList>

              {/* Active Members Tab */}
              <TabsContent value="members" className="mt-4">
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">User</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Role</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {team.length > 0 ? team.filter(m => m.status === 'active').map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{member.user?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{member.user?.email || 'No email'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.role === 'owner' ? (
                              <Badge variant="outline" className="capitalize font-semibold text-[10px] py-1 px-3 rounded-full border-wine/20 text-wine bg-wine/5">
                                {member.role}
                              </Badge>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleUpdate(member, e.target.value)}
                                disabled={teamBusy}
                                className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50"
                              >
                                {['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer'].map(r => (
                                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                              <span className="text-xs font-bold text-gray-600 capitalize">{member.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.role === 'owner' ? (
                              <span className="text-[10px] font-semibold uppercase text-gray-400">Protected</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {canManageBilling && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={teamBusy}
                                      onClick={() => openResetPasswordDialog(member)}
                                      className="text-blue-600 font-semibold text-[10px] uppercase hover:bg-blue-50 h-8 px-2"
                                      title="Reset password"
                                    >
                                      <Key className="w-3 h-3" />
                                    </Button>
                                    {isOwner && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={teamBusy}
                                        onClick={() => openChangeEmailDialog(member)}
                                        className="text-purple-600 font-semibold text-[10px] uppercase hover:bg-purple-50 h-8 px-2"
                                        title="Change email"
                                      >
                                        <Mail className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={teamBusy}
                                  onClick={() => handleRemoveMember(member)}
                                  className="text-rose-600 font-semibold text-[10px] uppercase hover:bg-rose-50 h-8 px-2"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">
                            No team members found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Pending Invitations Tab */}
              <TabsContent value="invitations" className="mt-4">
                <div className="border rounded-2xl overflow-hidden">
                  {invitationsBusy ? (
                    <div className="p-12 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : invitations.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Email</th>
                          <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Role</th>
                          <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Invited By</th>
                          <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Expires</th>
                          <th className="px-6 py-4 text-[10px] font-semibold uppercase text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 text-sm">{inv.email}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="capitalize text-[10px]">{inv.role}</Badge>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600">{inv.invited_by_name || inv.invited_by_email || 'Unknown'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {new Date(inv.expires_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInvitation(inv)}
                                  className="text-blue-600 font-semibold text-[10px] uppercase hover:bg-blue-50 h-8 px-2"
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(inv)}
                                  className="text-rose-600 font-semibold text-[10px] uppercase hover:bg-rose-50 h-8 px-2"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-gray-400 font-medium">
                      No pending invitations
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {selectedMember?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="rounded-xl"
                minLength={8}
              />
              <p className="text-xs text-gray-500">The member can sign in with this password immediately. Share it securely.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={actionBusy}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={changeEmailDialog} onOpenChange={setChangeEmailDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Change Email Address
            </DialogTitle>
            <DialogDescription>
              Update email for {selectedMember?.user?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
              <Input
                type="email"
                value={selectedMember?.user?.email || ''}
                readOnly
                className="rounded-xl bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>New Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new.email@company.com"
                className="rounded-xl"
              />
              <p className="text-xs text-amber-600 font-semibold">⚠️ This will update the user's login email</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeEmailDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={actionBusy}
              className="rounded-xl bg-purple-600 hover:bg-purple-700"
            >
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
