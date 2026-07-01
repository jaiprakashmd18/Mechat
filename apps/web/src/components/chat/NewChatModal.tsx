'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/Avatar';
import { createDirectChat, getChat, searchUsers } from '@/lib/chat';
import { useChatStore } from '@/store/chat.store';
import { getSocket } from '@/lib/socket';
import { apiErrorMessage } from '@/lib/api';
import type { User } from '@/types';

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const upsertChat = useChatStore((s) => s.upsertChat);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const users = await searchUsers(q);
        setResults(users);
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Search failed'));
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleSelect(user: User) {
    setStartingChatId(user.id);
    try {
      const created = await createDirectChat(user.id);
      const chat = await getChat(created.id);
      upsertChat(chat);
      getSocket()?.emit('chat:join', chat.id);
      onClose();
      router.push(`/home/${chat.id}`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not start chat'));
    } finally {
      setStartingChatId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New chat</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            className="input-field pl-9"
            placeholder="Search by name, username, or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {isSearching && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-brand-500" size={18} />
            </div>
          )}
          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No users found</p>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10"
              onClick={() => handleSelect(user)}
              disabled={startingChatId !== null}
            >
              <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.displayName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
              </div>
              {startingChatId === user.id && <Loader2 className="animate-spin text-brand-500" size={16} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
