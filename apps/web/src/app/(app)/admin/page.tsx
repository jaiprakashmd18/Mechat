'use client';

import Link from 'next/link';
import { ArrowLeft, BarChart2, Shield, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const STUB_STATS = [
  { label: 'Total users', value: '—' },
  { label: 'Active today', value: '—' },
  { label: 'Messages sent', value: '—' },
  { label: 'Groups', value: '—' },
];

const ADMIN_SECTIONS = [
  { icon: Users, label: 'User management', description: 'Search, suspend, or delete user accounts' },
  { icon: BarChart2, label: 'Analytics', description: 'Message volume, DAU, and retention charts' },
  { icon: Shield, label: 'Moderation', description: 'Reported content and flagged messages' },
];

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);

  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="glass-panel py-16 text-center">
          <Shield className="mx-auto mb-4 text-slate-400" size={40} />
          <p className="font-semibold">Admin access required</p>
          <p className="mt-1 text-sm text-slate-500">Your account does not have admin privileges.</p>
          <Link href="/home" className="btn-primary mt-6 inline-flex">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/home" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Admin panel</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STUB_STATS.map((stat) => (
          <div key={stat.label} className="glass-panel p-4 text-center">
            <p className="text-2xl font-bold text-brand-600">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden p-0">
        {ADMIN_SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <div
              key={section.label}
              className={`flex cursor-not-allowed items-center gap-4 px-5 py-4 opacity-50 ${
                i > 0 ? 'border-t border-slate-200/50 dark:border-white/5' : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
                <Icon size={18} />
              </div>
              <div>
                <p className="font-medium">{section.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
              <span className="ml-auto rounded bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">Soon</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
