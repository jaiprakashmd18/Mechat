import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  statusMessage: z.string().max(120).optional(),
  customTheme: z.record(z.any()).optional(),
});

export const registerDeviceKeySchema = z.object({
  deviceId: z.string().min(1),
  publicKey: z.string().min(1),
  signingPublicKey: z.string().optional(),
  algorithm: z.string().optional(),
});
