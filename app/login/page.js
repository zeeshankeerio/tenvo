'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient, useSession } from '@/lib/auth-client';
import { redirectAfterAuth } from '@/lib/auth/client/redirectAfterAuth';
import { toast } from 'react-hot-toast';
import { Key, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AuthShell,
  AuthDivider,
  AuthFooterLink,
  AuthGoogleButton,
  authInputClass,
  authLabelClass,
} from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { data: sessionData, isPending: sessionPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendSec, setOtpResendSec] = useState(0);
  const [authMode, setAuthMode] = useState('password');
  const postLoginHandledRef = useRef(null);

  useEffect(() => {
    if (otpResendSec <= 0) return undefined;
    const t = setTimeout(() => setOtpResendSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendSec]);

  const normalizeErrorMessage = (error) => {
    if (!error) return 'Login failed. Please verify your credentials.';
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    return 'Login failed. Please verify your credentials.';
  };

  const handlePostLogin = useCallback(
    async (user) => {
      if (!user?.id) return;
      if (postLoginHandledRef.current === user.id) return;
      postLoginHandledRef.current = user.id;
      await redirectAfterAuth(router, user);
    },
    [router]
  );

  useEffect(() => {
    if (sessionPending) return;
    const user = sessionData?.user;
    if (user?.id) void handlePostLogin(user);
  }, [sessionData?.user, sessionPending, handlePostLogin]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google') {
      toast.error('Google sign-in was cancelled or blocked. Try email login or use www.tenvo.store.');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        toast.error('Please enter both email and password.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD') {
          toast.error('Incorrect email or password.');
        } else if (error.code === 'USER_BANNED') {
          toast.error('This account has been suspended.');
        } else {
          toast.error(normalizeErrorMessage(error));
        }
        setIsLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) {
        toast.error('Session establishment failed.');
        setIsLoading(false);
        return;
      }
      await handlePostLogin(user);
    } catch (error) {
      toast.error(error.message?.includes('Invalid URL') ? 'Configuration error.' : 'Sign-in failed.');
      setIsLoading(false);
    }
  };

  const handleSendSignInOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Enter your email first.');
      return;
    }
    if (otpSent && otpResendSec > 0) return;
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: 'sign-in',
      });
      if (error) {
        toast.error(normalizeErrorMessage(error));
        return;
      }
      setOtpSent(true);
      setOtpResendSec(45);
      toast.success('Check your email for a sign-in code.');
    } catch (e) {
      toast.error(e.message || 'Could not send code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithOtp = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !otpCode.trim()) {
      toast.error('Enter email and code.');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await authClient.signIn.emailOtp({
        email: normalizedEmail,
        otp: otpCode.trim(),
        disableSignUp: true,
      });
      if (error) {
        toast.error(normalizeErrorMessage(error));
        setIsLoading(false);
        return;
      }
      const user = data?.user;
      if (!user) {
        toast.error('Session establishment failed.');
        setIsLoading(false);
        return;
      }
      await handlePostLogin(user);
    } catch (e) {
      toast.error(e.message || 'Sign-in failed.');
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/login',
        errorCallbackURL: '/login?error=google',
      });
    } catch (e) {
      toast.error(e?.message || 'Google sign-in failed.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      variant="login"
      title="Welcome back"
      subtitle="Sign in to your workspace."
      headerRight={
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg border-gray-200 bg-white px-4 text-xs font-bold shadow-sm hover:bg-gray-50"
          asChild
        >
          <Link href="/register">Create account</Link>
        </Button>
      }
      footer={
        <AuthFooterLink prompt="New to Tenvo?" href="/register" linkLabel="Register your business" />
      }
    >
      <div className="space-y-5">
        {googleAuthEnabled ? (
          <>
            <AuthGoogleButton disabled={isLoading || sessionPending} onClick={handleGoogle}>
              Continue with Google
            </AuthGoogleButton>
            <AuthDivider label="Or email" />
          </>
        ) : null}

        <Tabs value={authMode} onValueChange={setAuthMode} className="w-full">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-gray-100/90 p-1">
            <TabsTrigger
              value="password"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Password
            </TabsTrigger>
            <TabsTrigger
              value="otp"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Email code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="mt-5 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={authLabelClass}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(authInputClass, 'pl-10')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className={authLabelClass}>
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-bold text-wine hover:underline underline-offset-2"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(authInputClass, 'pl-10')}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading || sessionPending}
                className="h-11 w-full rounded-xl bg-wine text-sm font-bold text-white shadow-md shadow-wine/20 transition-all hover:bg-wine/90 active:scale-[0.99]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="otp" className="mt-5 space-y-4">
            <form onSubmit={handleSignInWithOtp} className="space-y-4">
              <div className="space-y-2">
                <Label className={authLabelClass}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(authInputClass, 'pl-10')}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-gray-200 text-xs font-bold"
                  disabled={isLoading || (otpSent && otpResendSec > 0)}
                  onClick={handleSendSignInOtp}
                >
                  {otpSent ? (otpResendSec > 0 ? `Resend (${otpResendSec}s)` : 'Resend') : 'Send code'}
                </Button>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={cn(authInputClass, 'w-[7.5rem] shrink-0 text-center font-mono text-base tracking-[0.2em]')}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || sessionPending}
                className="h-11 w-full rounded-xl bg-wine text-sm font-bold text-white hover:bg-wine/90"
              >
                {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Sign in with code'}
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-gray-400">
                Codes work for existing accounts. New businesses should{' '}
                <Link href="/register" className="font-semibold text-wine hover:underline">
                  register here
                </Link>
                .
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </AuthShell>
  );
}
