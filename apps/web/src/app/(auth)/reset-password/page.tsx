'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { OtpInput } from '@/components/ui/OtpInput';
import { resetPasswordRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValid = PASSWORD_RULE.test(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) {
      toast.error('Password must be 8+ characters with upper, lower, and a number');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await resetPasswordRequest(identifier, code, newPassword);
      toast.success(res.message);
      router.push('/login');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not reset your password'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the code we sent you and choose a new password"
      footer={
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text" htmlFor="identifier">
            Username, email, or phone
          </label>
          <input id="identifier" className="input-field" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>

        <div>
          <label className="label-text">Reset code</label>
          <OtpInput value={code} onChange={setCode} />
        </div>

        <div>
          <label className="label-text" htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || code.length !== 6}>
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Reset password
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
