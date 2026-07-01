'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { listChats } from '@/lib/chat';
import { chatDisplayName } from '@/lib/chatDisplay';

export default function GroupsPage() {
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);
  const chats = useChatStore((s) => s.chats);
  const setChats = useChatStore((s) => s.setChats);

  const groups = chats.filter((c) => c.type === 'GROUP');

  useEffect(() => {
    (async () => {
      try {
        const data = await listChats();
        setChats(data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setChats]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/home" className="btn-ghost -ml-2" aria-label="Back">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold">Groups</h1>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => alert('Create group — coming soon')}
        >
          <Plus size={16} />
          <span className="ml-1.5">New group</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-600" size={24} />
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10 text-brand-600">
            <Users size={28} />
          </div>
          <p className="font-semibold">No groups yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create a group to start chatting with multiple people.</p>
          <button
            type="button"
            className="btn-primary mt-2"
            onClick={() => alert('Create group — coming soon')}
          >
            <Plus size={16} />
            <span className="ml-1.5">Create a group</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden p-0">
          {groups.map((group, i) => {
            const name = chatDisplayName(group, user?.id);
            return (
              <Link
                key={group.id}
                href={`/home/${group.id}`}
                className={`flex items-center gap-3 px-4 py-3 transition hover:bg-black/5 dark:hover:bg-white/5 ${
                  i > 0 ? 'border-t border-slate-200/50 dark:border-white/5' : ''
                }`}
              >
                <Avatar name={name} src={group.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {group.participants.length} members
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
