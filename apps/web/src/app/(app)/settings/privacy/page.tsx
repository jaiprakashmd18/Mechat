'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Audience = 'everyone' | 'contacts' | 'nobody';

interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  options: { value: Audience; label: string }[];
  defaultValue: Audience;
}

const PRIVACY_SETTINGS: PrivacySetting[] = [
  {
    id: 'last_seen',
    label: 'Last seen',
    description: 'Who can see when you were last active',
    options: [{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'My contacts' }, { value: 'nobody', label: 'Nobody' }],
    defaultValue: 'everyone',
  },
  {
    id: 'profile_photo',
    label: 'Profile photo',
    description: 'Who can see your profile picture',
    options: [{ value: 'everyone', label: 'Everyone' }, { value: 'contacts', label: 'My contacts' }, { value: 'nobody', label: 'Nobody' }],
    defaultValue: 'everyone',
  },
  {
    id: 'read_receipts',
    label: 'Read receipts',
    description: 'Show double ticks when you\'ve read messages',
    options: [{ value: 'everyone', label: 'On' }, { value: 'nobody', label: 'Off' }],
    defaultValue: 'everyone',
  },
  {
    id: 'online_status',
    label: 'Online status',
    description: 'Who can see when you\'re online',
    options: [{ value: 'everyone', label: 'Everyone' }, { value: 'nobody', label: 'Nobody' }],
    defaultValue: 'everyone',
  },
];

export default function PrivacyPage() {
  const [values, setValues] = useState<Record<string, Audience>>(
    Object.fromEntries(PRIVACY_SETTINGS.map((s) => [s.id, s.defaultValue])),
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Privacy</h1>
      </div>

      <div className="glass-panel overflow-hidden p-0">
        {PRIVACY_SETTINGS.map((setting, i) => (
          <div
            key={setting.id}
            className={`px-5 py-4 ${i > 0 ? 'border-t border-slate-200/50 dark:border-white/5' : ''}`}
          >
            <div className="mb-2">
              <p className="font-medium">{setting.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{setting.description}</p>
            </div>
            <div className="flex gap-2">
              {setting.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [setting.id]: opt.value }))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    values[setting.id] === opt.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-black/5 text-slate-600 hover:bg-black/10 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Privacy settings are stored locally. Full server-side enforcement is coming soon.
      </p>
    </div>
  );
}
