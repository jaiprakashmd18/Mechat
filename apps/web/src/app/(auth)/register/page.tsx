'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { registerRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const deviceId = useAuthStore((s) => s.deviceId);
  const setSession = useAuthStore((s) => s.setSession);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValid = PASSWORD_RULE.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) {
      toast.error('Password must be 8+ characters with upper, lower, and a number');
      return;
    }
    setIsSubmitting(true);
    try {
      const { user, accessToken } = await registerRequest({
        username,
        displayName,
        email,
        password,
        deviceId,
        deviceName: typeof navigator !== 'undefined' ? navigator.platform : 'Web',
        deviceType: 'web',
      });
      setSession(user, accessToken);
      toast.success(`Welcome to MeCHAT, ${user.displayName}!`);
      router.push('/home');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not create your account'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join MeCHAT in seconds"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-text" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              pattern="^[a-zA-Z0-9_.]{3,32}$"
              title="3-32 characters: letters, numbers, underscores, dots"
              required
            />
          </div>
        </div>

        <div>
          <label className="label-text" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label-text" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
          <p className={`mt-1.5 text-xs ${password && !passwordValid ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
            8+ characters with uppercase, lowercase, and a number
          </p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
