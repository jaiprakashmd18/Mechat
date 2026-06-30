'use client';

import { useAuthStore } from '@/store/auth.store';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-panel max-w-md p-10 text-center">
        <h1 className="text-2xl font-semibold">Welcome, {user?.displayName ?? 'there'}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The chat experience is coming up next.</p>
      </div>
    </main>
  );
}
