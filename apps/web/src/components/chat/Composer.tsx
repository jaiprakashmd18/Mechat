'use client';

import { useRef, useState } from 'react';
import { Loader2, Paperclip, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendMessage, uploadMedia } from '@/lib/chat';
import { getSocket } from '@/lib/socket';
import { apiErrorMessage } from '@/lib/api';
import type { MessageType } from '@/types';

function mimeToMessageType(mimeType: string): MessageType {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

export function Composer({ chatId }: { chatId: string }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(value: string) {
    setText(value);
    const socket = getSocket();
    if (!socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', chatId);
    }
    clearTimeout(stopTypingTimeout.current);
    stopTypingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', chatId);
    }, 2000);
  }

  function stopTypingNow() {
    clearTimeout(stopTypingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket()?.emit('typing:stop', chatId);
    }
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || isSending) return;
    setIsSending(true);
    stopTypingNow();
    try {
      await sendMessage({ chatId, content, type: 'TEXT' });
      setText('');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not send message'));
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      const media = await uploadMedia(file);
      await sendMessage({ chatId, type: mimeToMessageType(file.type), mediaIds: [media.id] });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not upload file'));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="glass border-t border-white/40 px-4 py-3 dark:border-white/10 sm:px-6">
      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          className="btn-ghost shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Attach a file"
        >
          {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Paperclip size={18} />}
        </button>

        <textarea
          rows={1}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={stopTypingNow}
          placeholder="Type a message"
          className="input-field max-h-32 flex-1 resize-none py-2.5"
        />

        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          aria-label="Send message"
        >
          {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
