import { z } from 'zod';

export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(8).optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  readReceiptsEnabled: z.boolean().optional(),
  lastSeenVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  profilePhotoVisibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  autoDownloadMedia: z.boolean().optional(),
  defaultDisappearingTtlSec: z.number().int().nonnegative().nullable().optional(),
});
