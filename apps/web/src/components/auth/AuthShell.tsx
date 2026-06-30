import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="absolute left-6 top-6">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="glass-panel w-full max-w-md animate-slide-up p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
      </div>
    </main>
  );
}
