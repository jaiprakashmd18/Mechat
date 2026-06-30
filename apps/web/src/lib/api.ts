import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: env.API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const deviceId = useAuthStore.getState().deviceId;
    const res = await axios.post(
      `${env.API_URL}/api/auth/refresh`,
      { deviceId },
      { withCredentials: true },
    );
    const { user, accessToken } = res.data.data;
    useAuthStore.getState().setSession(user, accessToken);
    return accessToken as string;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    if (status === 401 && original && !original._retry && !url.includes('/api/auth/')) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as any)?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export { refreshAccessToken };
