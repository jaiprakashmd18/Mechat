import { z } from 'zod';

export const updateAccountStatusSchema = z.object({
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: z.string().max(500).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['REVIEWING', 'RESOLVED', 'DISMISSED']),
  resolutionNote: z.string().max(500).optional(),
});

export const fileReportSchema = z.object({
  reportedUserId: z.string().optional(),
  messageId: z.string().optional(),
  chatId: z.string().optional(),
  reason: z.string().min(1).max(200),
  details: z.string().max(1000).optional(),
});
