'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface AuthContextValue {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isLoading: true });

export function useAuthBootstrap() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (!cancelled && !token) clearSession();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }
  }, [accessToken]);

  return <AuthContext.Provider value={{ isLoading }}>{children}</AuthContext.Provider>;
}
