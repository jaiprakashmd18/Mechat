'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="mb-2 text-8xl font-bold text-red-500 opacity-20">500</div>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-slate-500 dark:text-slate-400">
        An unexpected error occurred. You can try again or return home.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-slate-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-2 flex gap-3">
        <button type="button" className="btn-secondary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
