'use client';

import type React from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Lock, Palette, Shield, Smartphone, User } from 'lucide-react';

interface SettingsSection {
  icon: React.ElementType;
  label: string;
  href: string;
  description: string;
  disabled?: boolean;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { icon: User, label: 'Account & Profile', href: '/profile', description: 'Edit display name, avatar, and bio' },
  { icon: Bell, label: 'Notifications', href: '/settings/notifications', description: 'Control push and in-app alerts' },
  { icon: Lock, label: 'Privacy', href: '/settings/privacy', description: 'Manage who sees your info' },
  { icon: Palette, label: 'Appearance', href: '/settings/appearance', description: 'Theme and display preferences', disabled: true },
  { icon: Smartphone, label: 'Devices', href: '/settings/devices', description: 'Manage logged-in devices', disabled: true },
  { icon: Shield, label: 'Security', href: '/settings/security', description: '2FA and active sessions', disabled: true },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/home" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="glass-panel overflow-hidden p-0">
        {SETTINGS_SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const content = (
            <div
              key={section.href}
              className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-slate-200/50 dark:border-white/5' : ''} ${
                section.disabled ? 'opacity-40' : 'transition hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{section.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
              <span className="text-slate-400">&rsaquo;</span>
            </div>
          );
          if (section.disabled) return content;
          return (
            <Link key={section.href} href={section.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
