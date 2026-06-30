'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { forgotPasswordRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await forgotPasswordRequest(identifier);
      toast.success(res.message);
      router.push(`/reset-password?identifier=${encodeURIComponent(identifier)}`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not process your request'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We'll send a reset code to your email or phone"
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Back to login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-text" htmlFor="identifier">
            Username, email, or phone
          </label>
          <input
            id="identifier"
            className="input-field"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Send reset code
        </button>
      </form>
    </AuthShell>
  );
}
