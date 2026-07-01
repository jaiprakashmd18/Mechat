'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Moon, SquarePen, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { useUiStore } from '@/store/ui.store';
import { chatDisplayAvatar, chatDisplayName, messagePreview, otherParticipant } from '@/lib/chatDisplay';
import { formatRelativeTime, cn } from '@/lib/utils';
import { logoutRequest } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api';

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const chats = useChatStore((s) => s.chats);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const activeChatId = pathname?.startsWith('/home/') ? pathname.split('/home/')[1] : null;

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => chatDisplayName(c, user?.id).toLowerCase().includes(q));
  }, [chats, search, user?.id]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not log out cleanly'));
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

  return (
    <aside
      className={cn(
        'glass flex h-full w-full flex-col border-r border-white/40 dark:border-white/10 lg:w-96',
        activeChatId && 'hidden lg:flex',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setIsNewChatOpen(true)} aria-label="New chat">
            <SquarePen size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <input className="input-field" placeholder="Search chats" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {filteredChats.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-400">No conversations yet. Start a new chat.</p>
        )}
        {filteredChats.map((chat) => {
          const name = chatDisplayName(chat, user?.id);
          const avatarUrl = chatDisplayAvatar(chat, user?.id);
          const other = chat.type === 'DIRECT' ? otherParticipant(chat, user?.id) : undefined;
          const isActive = activeChatId === chat.id;

          return (
            <Link
              key={chat.id}
              href={`/home/${chat.id}`}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10',
                isActive && 'bg-brand-600/10 dark:bg-brand-500/15',
              )}
            >
              <Avatar name={name} src={avatarUrl} status={chat.type === 'DIRECT' ? other?.status : undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(chat.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{messagePreview(chat.lastMessage)}</p>
                  {!!chat.unreadCount && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-medium text-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/40 px-4 py-3 dark:border-white/10">
        <Link href="/profile" className="flex min-w-0 items-center gap-2">
          <Avatar name={user?.displayName ?? ''} src={user?.avatarUrl} size="sm" />
          <span className="truncate text-sm font-medium">{user?.displayName}</span>
        </Link>
        <button type="button" className="btn-ghost" onClick={handleLogout} disabled={isLoggingOut} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>

      {isNewChatOpen && <NewChatModal onClose={() => setIsNewChatOpen(false)} />}
    </aside>
  );
}
