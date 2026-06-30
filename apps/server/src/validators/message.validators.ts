import { z } from 'zod';

export const messageTypeEnum = z.enum([
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'VOICE_NOTE',
  'FILE',
  'LOCATION',
  'CONTACT',
  'POLL',
  'STICKER',
  'GIF',
]);

export const sendMessageSchema = z.object({
  chatId: z.string().min(1),
  type: messageTypeEnum.default('TEXT'),
  content: z.string().max(8000).optional(),
  replyToId: z.string().optional(),
  forwardedFromId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  signature: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
  contact: z.object({ name: z.string(), phone: z.string().optional(), email: z.string().optional() }).optional(),
  poll: z
    .object({
      question: z.string().min(1).max(200),
      options: z.array(z.string().min(1).max(80)).min(2).max(10),
      allowsMultiple: z.boolean().optional(),
      closesAt: z.string().datetime().optional(),
    })
    .optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const scheduleMessageSchema = z.object({
  chatId: z.string().min(1),
  type: messageTypeEnum.default('TEXT'),
  content: z.string().min(1).max(8000),
  scheduledAt: z.string().datetime(),
});

export const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
});
