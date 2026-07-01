'use client';

import Link from 'next/link';
import { ArrowLeft, PhoneCall } from 'lucide-react';

export default function CallsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/home" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Calls</h1>
      </div>

      <div className="glass-panel flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-400">
          <PhoneCall size={32} />
        </div>
        <div>
          <p className="text-lg font-semibold">Voice & Video calls</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            End-to-end encrypted calls are coming soon.
          </p>
        </div>
        <div className="mt-2 rounded-xl border border-brand-600/20 bg-brand-600/5 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
          The backend signaling infrastructure is ready. The in-app calling UI is on the roadmap.
        </div>
      </div>
    </div>
  );
}
