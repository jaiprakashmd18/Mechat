import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  memberIds: z.array(z.string()).min(1),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  announcement: z.string().max(1000).optional(),
});

export const addMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1),
});

export const changeRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER']),
});

export const createInviteSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional(),
});
