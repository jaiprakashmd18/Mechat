'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { OtpInput } from '@/components/ui/OtpInput';
import { loginRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const deviceId = useAuthStore((s) => s.deviceId);
  const setSession = useAuthStore((s) => s.setSession);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await loginRequest({
        identifier,
        password,
        totpCode: needsTwoFactor ? totpCode : undefined,
        deviceId,
        deviceName: typeof navigator !== 'undefined' ? navigator.platform : 'Web',
        deviceType: 'web',
      });

      if (result.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        toast('Enter your 6-digit authenticator code', { icon: '🔐' });
        return;
      }

      if (result.user && result.accessToken) {
        setSession(result.user, result.accessToken);
        toast.success(`Welcome back, ${result.user.displayName}`);
        router.push('/home');
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Invalid credentials'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsTwoFactor) {
    return (
      <AuthShell title="Two-factor verification" subtitle="Enter the 6-digit code from your authenticator app">
        <form onSubmit={handleSubmit} className="space-y-5">
          <OtpInput value={totpCode} onChange={setTotpCode} />
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting || totpCode.length !== 6}>
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            Verify and continue
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => setNeedsTwoFactor(false)}>
            Back to login
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your conversations"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Sign up
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
            placeholder="you@example.com"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-text" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Log in
        </button>
      </form>
    </AuthShell>
  );
}
