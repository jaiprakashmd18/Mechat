import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  deviceId: string;
  setSession: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (patch: Partial<User>) => void;
  clearSession: () => void;
}

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'server';
  const key = 'mechat_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      deviceId: getOrCreateDeviceId(),
      setSession: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      updateUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'mechat-auth',
      partialize: (s) => ({ user: s.user, deviceId: s.deviceId }),
    },
  ),
);
