'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { OtpInput } from '@/components/ui/OtpInput';
import { requestOtp, verifyOtpRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = searchParams.get('target') ?? '';
  const purpose = searchParams.get('purpose') ?? 'EMAIL_VERIFY';
  const redirectTo = searchParams.get('redirect') ?? '/home';

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await verifyOtpRequest(target, purpose, code);
      toast.success('Verified successfully');
      router.push(redirectTo);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Invalid or expired code'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    try {
      await requestOtp(target, purpose);
      toast.success('A new code has been sent');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not resend code'));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell title="Verify your account" subtitle={target ? `Enter the code sent to ${target}` : 'Enter the verification code'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <OtpInput value={code} onChange={setCode} />
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || code.length !== 6}>
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Verify
        </button>
        <button type="button" className="btn-ghost w-full" onClick={handleResend} disabled={isResending}>
          {isResending && <Loader2 className="animate-spin" size={16} />}
          Resend code
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
