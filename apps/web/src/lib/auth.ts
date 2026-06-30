import { api } from '@/lib/api';
import type { User } from '@/types';

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  deviceType?: 'web' | 'android' | 'ios' | 'desktop';
}

export interface RegisterPayload extends DeviceInfo {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginPayload extends DeviceInfo {
  identifier: string;
  password: string;
  totpCode?: string;
}

export interface LoginResult {
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: User;
  accessToken?: string;
}

export async function registerRequest(payload: RegisterPayload) {
  const res = await api.post('/api/auth/register', payload);
  return res.data.data as { user: User; accessToken: string };
}

export async function loginRequest(payload: LoginPayload) {
  const res = await api.post('/api/auth/login', payload);
  if (res.data.requiresTwoFactor) {
    return { requiresTwoFactor: true, userId: res.data.userId } as LoginResult;
  }
  return { user: res.data.data.user, accessToken: res.data.data.accessToken } as LoginResult;
}

export async function logoutRequest() {
  await api.post('/api/auth/logout');
}

export async function requestOtp(target: string, purpose: string) {
  const res = await api.post('/api/auth/otp/request', { target, purpose });
  return res.data.data as { expiresAt: string };
}

export async function verifyOtpRequest(target: string, purpose: string, code: string) {
  const res = await api.post('/api/auth/otp/verify', { target, purpose, code });
  return res.data as { success: boolean; verified: boolean };
}

export async function forgotPasswordRequest(identifier: string) {
  const res = await api.post('/api/auth/forgot-password', { identifier });
  return res.data as { success: boolean; message: string };
}

export async function resetPasswordRequest(identifier: string, code: string, newPassword: string) {
  const res = await api.post('/api/auth/reset-password', { identifier, code, newPassword });
  return res.data as { success: boolean; message: string };
}
