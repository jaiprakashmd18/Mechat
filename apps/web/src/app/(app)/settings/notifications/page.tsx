'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Toggle {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const TOGGLES: Toggle[] = [
  { id: 'push_messages', label: 'New messages', description: 'Push notification for incoming messages', defaultOn: true },
  { id: 'push_mentions', label: 'Mentions', description: 'Alert when someone @-mentions you in a group', defaultOn: true },
  { id: 'push_reactions', label: 'Reactions', description: 'Alert when someone reacts to your message', defaultOn: false },
  { id: 'push_calls', label: 'Incoming calls', description: 'Alert for voice and video calls', defaultOn: true },
  { id: 'push_groups', label: 'Group invites', description: 'Alert when added to a group', defaultOn: true },
  { id: 'sound', label: 'Notification sound', description: 'Play a sound for notifications', defaultOn: true },
  { id: 'preview', label: 'Message preview', description: 'Show message content in notifications', defaultOn: true },
];

export default function NotificationsPage() {
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map((t) => [t.id, t.defaultOn])),
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Notifications</h1>
      </div>

      <div className="glass-panel overflow-hidden p-0">
        {TOGGLES.map((toggle, i) => (
          <div
            key={toggle.id}
            className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-slate-200/50 dark:border-white/5' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{toggle.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{toggle.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values[toggle.id]}
              onClick={() => setValues((v) => ({ ...v, [toggle.id]: !v[toggle.id] }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                values[toggle.id] ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  values[toggle.id] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Notification preferences are stored locally and will apply after the next app reload.
      </p>
    </div>
  );
}
