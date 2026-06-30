import { z } from 'zod';

export const createDirectChatSchema = z.object({
  userId: z.string().min(1),
});

export const updateChatSchema = z.object({
  wallpaperUrl: z.string().url().optional(),
  disappearingTtlSec: z.number().int().nonnegative().nullable().optional(),
});
