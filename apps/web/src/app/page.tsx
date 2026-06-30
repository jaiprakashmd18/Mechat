import Link from 'next/link';
import { ShieldCheck, Zap, Users, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const features = [
  { icon: Zap, title: 'Real-time everything', body: 'Instant delivery, typing indicators, read receipts, and live presence powered by Socket.IO.' },
  { icon: Lock, title: 'Encrypted at rest', body: 'Messages are encrypted with AES-256-GCM, with key-exchange infrastructure for end-to-end encryption.' },
  { icon: Users, title: 'Groups that scale', body: 'Unlimited group chats with owner/admin/moderator roles and shareable invite links.' },
  { icon: ShieldCheck, title: 'Hardened by default', body: '2FA, device sessions, rate limiting, and audit logs keep your account safe.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-16 text-center">
        <h1 className="animate-slide-up text-4xl font-semibold tracking-tight sm:text-6xl">
          Private messaging,
          <br />
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">reimagined.</span>
        </h1>
        <p className="mt-6 max-w-xl animate-slide-up text-balance text-lg text-slate-600 dark:text-slate-300">
          MeCHAT is a fast, secure, real-time messaging app with groups, media sharing, and enterprise-grade
          security — built for the way you actually talk.
        </p>
        <div className="mt-8 flex animate-slide-up gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">
            Create your account
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            I already have one
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass-panel p-6">
            <Icon className="mb-3 text-brand-600 dark:text-brand-400" size={26} />
            <h3 className="font-medium">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200/60 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        © {new Date().getFullYear()} MeCHAT. All rights reserved.
      </footer>
    </main>
  );
}
