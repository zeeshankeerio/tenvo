'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Mail, Building2, UserPlus } from 'lucide-react';
import { validateInvitationToken, acceptInvitation } from '@/lib/actions/admin/users';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';

/**
 * Loading fallback for Suspense boundary
 */
function InvitationPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-slate-200">
        <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-wine" />
          <p className="text-sm font-semibold text-slate-600">Loading invitation...</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Accept Invitation Page Content (with useSearchParams)
 */
function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [accepted, setAccepted] = useState(false);

  // Registration form for new users
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await authClient.getSession();
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user);
        setEmail(session.user.email);
        setName(session.user.name || '');
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Validate invitation token
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check the link in your email.');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      setValidating(true);
      try {
        const result = await validateInvitationToken(token);
        if (result.success) {
          setInvitation(result.invitation);
          if (!isAuthenticated) {
            setEmail(result.invitation.email);
          }
        } else {
          setError(result.error || 'Invalid or expired invitation link.');
        }
      } catch (err) {
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setValidating(false);
      }
    };

    if (!loading) {
      validateToken();
    }
  }, [token, loading, isAuthenticated]);

  const handleRegisterAndAccept = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setAccepting(true);
    try {
      // Register new user
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: invitation.email,
        password,
        name,
      });

      if (signUpError) {
        toast.error(signUpError.message || 'Failed to create account');
        setAccepting(false);
        return;
      }

      if (!signUpData?.user?.id) {
        toast.error('Failed to create account. Please try again.');
        setAccepting(false);
        return;
      }

      // Accept invitation
      const acceptResult = await acceptInvitation(token, signUpData.user.id);
      
      if (acceptResult.success) {
        setAccepted(true);
        toast.success('Account created and invitation accepted!');
        setTimeout(() => {
          router.push('/multi-business');
        }, 2000);
      } else {
        toast.error(acceptResult.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptExistingUser = async () => {
    if (!currentUser?.id) {
      toast.error('Please sign in first');
      return;
    }

    setAccepting(true);
    try {
      const result = await acceptInvitation(token, currentUser.id);
      
      if (result.success) {
        setAccepted(true);
        toast.success('Invitation accepted successfully!');
        setTimeout(() => {
          router.push('/multi-business');
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      console.error('Accept invitation error:', err);
      toast.error('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to sign in with return URL
    const returnUrl = `/accept-invitation?token=${token}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  };

  if (loading || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-slate-200">
          <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-wine" />
            <p className="text-sm font-semibold text-slate-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-red-200">
          <CardHeader className="space-y-1 pb-4 pt-6 bg-gradient-to-r from-red-50/80 to-white border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 ring-1 ring-red-200">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Invalid Invitation</CardTitle>
                <CardDescription className="text-sm text-slate-600 mt-1">This invitation link is not valid</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-slate-700 mb-6">{error}</p>
            <Button
              onClick={() => router.push('/')}
              className="w-full rounded-xl h-11 font-semibold bg-slate-900 hover:bg-slate-800 text-white"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl border-emerald-200">
          <CardHeader className="space-y-1 pb-4 pt-6 bg-gradient-to-r from-emerald-50/80 to-white border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Welcome Aboard!</CardTitle>
                <CardDescription className="text-sm text-slate-600 mt-1">Invitation accepted successfully</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-slate-700 mb-4">
              You've been added to <span className="font-bold text-slate-900">{invitation?.business_name}</span> with the role of{' '}
              <span className="font-bold text-wine capitalize">{invitation?.role}</span>.
            </p>
            <p className="text-sm text-slate-600">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-slate-200">
        <CardHeader className="space-y-1 pb-4 pt-6 bg-gradient-to-r from-wine/5 to-white border-b border-wine/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine ring-1 ring-wine/20">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Team Invitation</CardTitle>
              <CardDescription className="text-sm text-slate-600 mt-1">Join your team workspace</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6 space-y-6">
          {invitation && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Business</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{invitation.business_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Role</p>
                  <p className="text-sm font-bold text-wine capitalize mt-0.5">{invitation.role}</p>
                </div>
              </div>
            </div>
          )}

          {isAuthenticated ? (
            // Existing user - just accept
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-900">Signed in as {currentUser?.email}</p>
                <p className="text-xs text-emerald-700 mt-1">Click below to accept this invitation</p>
              </div>
              <Button
                onClick={handleAcceptExistingUser}
                disabled={accepting}
                className="w-full rounded-xl h-11 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignIn}
                className="w-full rounded-xl h-11 font-semibold border-slate-200"
              >
                Sign in with different account
              </Button>
            </div>
          ) : (
            // New user - register and accept
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Email</Label>
                <Input
                  type="email"
                  value={email}
                  readOnly
                  className="rounded-xl h-11 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="rounded-xl h-11"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={accepting}
                className="w-full rounded-xl h-11 font-semibold bg-wine hover:bg-wine/90 text-white shadow-md shadow-wine/20"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Accept'
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="text-sm font-semibold text-wine hover:text-wine/80 underline underline-offset-2"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Accept Invitation Page (with Suspense boundary)
 * Allows users to accept email invitations to join a business
 */
export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<InvitationPageLoading />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
