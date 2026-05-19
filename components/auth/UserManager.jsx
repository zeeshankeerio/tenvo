'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
    User,
    Settings,
    LogOut,
    Building2,
    ChevronRight,
    Shield,
    BadgeCheck,
    Mail,
    Smartphone
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

/**
 * UserManager Component
 * Consolidates User Profile, Business Context, and Auth Actions
 */
export function UserManager({ trigger }) {
    const { user, signOut, updateProfile } = useAuth();
    const router = useRouter();
    const { business, role, isPlatformOwner } = useBusiness();
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const canManageBilling = isPlatformOwner || role === 'owner';
    const accessRoute = business?.domain
        ? `/business/${business.domain}?tab=settings&section=${canManageBilling ? 'billing' : 'team'}`
        : '/multi-business';

    const [profileForm, setProfileForm] = useState({
        fullName: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
    });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            await updateProfile({
                full_name: profileForm.fullName,
                phone: profileForm.phone
            });
            toast.success('Profile updated successfully');
            setShowProfileDialog(false);
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {trigger || (
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-wine/10 text-wine font-bold">{userInitials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    )}
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-72 p-2 rounded-2xl shadow-2xl border-wine/5 animate-in slide-in-from-top-2">
                    <DropdownMenuLabel className="p-4 bg-gray-50/50 rounded-xl mb-2">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-wine text-white font-bold">{userInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 truncate">
                                    {user?.user_metadata?.full_name || 'Business Pro'}
                                </span>
                                <span className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {user?.email}
                                </span>
                            </div>
                        </div>
                        {business && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-wine" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Shop</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold border-wine/20 text-wine h-5">
                                    {business.business_name}
                                </Badge>
                            </div>
                        )}
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="-mx-2 bg-gray-50" />

                    <div className="p-1">
                        <DropdownMenuItem
                            onClick={() => setShowProfileDialog(true)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:bg-wine/5 focus:text-wine group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-focus:bg-wine group-focus:text-white transition-colors">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">My Profile</span>
                                <span className="text-[10px] font-medium text-gray-400">Account security & settings</span>
                            </div>
                            <ChevronRight className="ml-auto w-4 h-4 text-gray-300 group-focus:text-wine/40" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:bg-wine/5 focus:text-wine group"
                            onClick={() => router.push(business?.domain ? `/business/${business.domain}?tab=settings&section=profile` : '/multi-business')}
                        >
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-focus:bg-wine group-focus:text-white transition-colors">
                                <Settings className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">Business Settings</span>
                                <span className="text-[10px] font-medium text-gray-400">Configurations & tax</span>
                            </div>
                            <ChevronRight className="ml-auto w-4 h-4 text-gray-300 group-focus:text-wine/40" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => router.push(accessRoute)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:bg-wine/5 focus:text-wine group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-focus:bg-wine group-focus:text-white transition-colors">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{canManageBilling ? 'Subscription & Billing' : 'Users & Access Control'}</span>
                                <span className="text-[10px] font-medium text-gray-400">{canManageBilling ? 'Plan seats, upgrades, and feature access' : 'Team roles, permissions, and membership controls'}</span>
                            </div>
                            <ChevronRight className="ml-auto w-4 h-4 text-gray-300 group-focus:text-wine/40" />
                        </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="-mx-2 bg-gray-50" />

                    <div className="p-1">
                        <DropdownMenuItem
                            onClick={() => signOut()}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:bg-red-50 focus:text-red-600 font-bold group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-focus:bg-red-600 group-focus:text-white transition-colors">
                                <LogOut className="w-4 h-4" />
                            </div>
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="h-24 bg-gradient-to-r from-wine to-wine-light p-6">
                        <DialogTitle className="text-white text-xl font-black">Account Settings</DialogTitle>
                        <DialogDescription className="text-white/70 text-sm font-medium">Manage your personal ERP access profile</DialogDescription>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="p-6 space-y-6 bg-white">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Name</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-wine transition-colors" />
                                    <Input
                                        placeholder="Enter your full name"
                                        className="pl-10 h-12 rounded-xl border-gray-100 focus:border-wine/30"
                                        value={profileForm.fullName}
                                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Phone Number</Label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-wine transition-colors" />
                                    <Input
                                        placeholder="+92 3XX XXXXXXX"
                                        className="pl-10 h-12 rounded-xl border-gray-100 focus:border-wine/30"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 opacity-60">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Registered Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={user?.email}
                                        disabled
                                        className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-100"
                                    />
                                    <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl flex items-start gap-4 border border-gray-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Shield className="w-5 h-5 text-wine" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900">Enterprise Security</h4>
                                <p className="text-xs text-gray-500 font-medium">Your account is secured with end-to-end encryption and Row Level Security.</p>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-50">
                            <Button type="button" variant="ghost" onClick={() => setShowProfileDialog(false)} className="flex-1 font-bold rounded-xl h-11">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating} className="flex-1 font-bold rounded-xl h-11 shadow-lg shadow-wine/20 bg-emerald-600 hover:bg-emerald-700 text-white">
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
