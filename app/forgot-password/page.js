'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      variant="login"
      title="Reset password"
      subtitle="Password reset is handled through email OTP sign-in for now."
    >
      <p className="text-sm text-gray-600">
        Use the one-time code tab on the sign-in page, or contact support if you are locked out of your account.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </AuthShell>
  );
}
