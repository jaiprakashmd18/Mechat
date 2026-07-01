'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth.store';
import { api, apiErrorMessage } from '@/lib/api';
import { uploadMedia } from '@/lib/chat';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio ?? '');
      setStatusMessage(user.statusMessage ?? '');
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.patch('/users/me', {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        statusMessage: statusMessage.trim() || undefined,
      });
      updateUser(res.data.data);
      toast.success('Profile saved');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save profile'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const media = await uploadMedia(file);
      const res = await api.patch('/users/me', { avatarUrl: media.url });
      updateUser(res.data.data);
      toast.success('Avatar updated');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not update avatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/home" className="btn-ghost -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold">Edit profile</h1>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name={user?.displayName ?? ''} src={user?.avatarUrl} size="lg" />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition hover:bg-brand-700"
              aria-label="Change avatar"
            >
              {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="text-center">
            <p className="font-semibold">{user?.displayName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">@{user?.username}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Display name</label>
            <input
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Bio</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              placeholder="Tell others about yourself"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{bio.length}/280</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status message</label>
            <input
              className="input-field"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              maxLength={120}
              placeholder="What's on your mind?"
            />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary w-full" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span className="ml-2">Save changes</span>
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Account info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Username</span>
            <span className="font-medium">@{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">User ID</span>
            <span className="font-mono text-xs">{user?.uniqueUserId ?? user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
