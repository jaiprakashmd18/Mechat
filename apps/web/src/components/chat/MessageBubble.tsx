'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, ReceiptStatus } from '@/types';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function StatusTicks({ status }: { status: ReceiptStatus }) {
  if (status === 'SEEN') return <CheckCheck size={14} className="text-sky-300" />;
  if (status === 'DELIVERED') return <CheckCheck size={14} className="text-white/70" />;
  return <Check size={14} className="text-white/70" />;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSenderName: boolean;
  receiptStatus: ReceiptStatus;
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
}

export function MessageBubble({ message, isMine, showSenderName, receiptStatus, currentUserId, onToggleReaction }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const myReactionEmojis = new Set(
    currentUserId ? (message.reactions ?? []).filter((r) => r.userId === currentUserId).map((r) => r.emoji) : [],
  );

  return (
    <div className={cn('group flex', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[85%] items-center gap-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
        <div className={cn('max-w-full', isMine ? 'bubble-mine' : 'bubble-theirs')}>
          {showSenderName && !isMine && (
            <p className="mb-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">{message.sender?.displayName}</p>
          )}

          {message.isDeleted ? (
            <p className="italic opacity-60">This message was deleted</p>
          ) : (
            <>
              {message.attachments?.map((a) => (
                <div key={a.id} className="mb-1.5">
                  {a.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.fileName} className="max-h-64 rounded-lg object-cover" />
                  ) : a.mimeType.startsWith('video/') ? (
                    <video src={a.url} controls className="max-h-64 rounded-lg" />
                  ) : a.mimeType.startsWith('audio/') ? (
                    <audio src={a.url} controls className="w-full" />
                  ) : (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg bg-black/5 px-3 py-2 text-xs underline dark:bg-white/10"
                    >
                      {a.fileName}
                    </a>
                  )}
                </div>
              ))}
              {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
            </>
          )}

          <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', isMine ? 'text-white/70' : 'text-slate-400')}>
            {message.isEdited && <span>edited</span>}
            <span>{time}</span>
            {isMine && <StatusTicks status={receiptStatus} />}
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(
                message.reactions.reduce<Record<string, number>>((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  className={cn(
                    'rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] dark:bg-white/10',
                    myReactionEmojis.has(emoji) && 'ring-1 ring-brand-500',
                  )}
                >
                  {emoji} {count > 1 ? count : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {!message.isDeleted && (
          <div className="hidden shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 opacity-0 shadow-sm transition group-hover:flex group-hover:opacity-100 dark:bg-slate-800/90">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={cn(
                  'rounded-full p-1 text-sm hover:bg-black/5 dark:hover:bg-white/10',
                  myReactionEmojis.has(emoji) && 'bg-brand-600/10',
                )}
                onClick={() => onToggleReaction(emoji)}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
