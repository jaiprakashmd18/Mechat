'use client';

import { MessagesSquare } from 'lucide-react';

export default function HomeIndexPage() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-3 text-center lg:flex">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-400">
        <MessagesSquare size={28} />
      </div>
      <div>
        <p className="text-lg font-semibold">Select a chat</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a conversation from the list or start a new one.</p>
      </div>
    </div>
  );
}
