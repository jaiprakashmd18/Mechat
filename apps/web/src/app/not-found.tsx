import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="mb-2 text-8xl font-bold text-brand-600 opacity-20">404</div>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-slate-500 dark:text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary mt-2">
        Go home
      </Link>
    </div>
  );
}
