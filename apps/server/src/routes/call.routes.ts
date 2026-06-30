import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const router = Router();

const startCallSchema = z.object({
  chatId: z.string().min(1),
  type: z.enum(['VOICE', 'VIDEO']),
});

router.get(
  '/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const calls = await prisma.call.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        initiator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
        chat: { select: { id: true, type: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: calls });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { chatId, type } = startCallSchema.parse(req.body);
    const participant = await prisma.chatParticipant.findUnique({ where: { chatId_userId: { chatId, userId: req.user!.id } } });
    if (!participant) throw ApiError.forbidden('Not a participant of this chat');

    const chatParticipants = await prisma.chatParticipant.findMany({ where: { chatId, leftAt: null } });

    const call = await prisma.call.create({
      data: {
        chatId,
        initiatorId: req.user!.id,
        type,
        participants: { create: chatParticipants.map((p) => ({ userId: p.userId, joinedAt: p.userId === req.user!.id ? new Date() : undefined })) },
      },
      include: { participants: true },
    });

    res.status(201).json({ success: true, data: call });
  }),
);

router.patch(
  '/:id/end',
  requireAuth,
  asyncHandler(async (req, res) => {
    const call = await prisma.call.findUniqueOrThrow({ where: { id: req.params.id } });
    const durationSec = Math.round((Date.now() - call.startedAt.getTime()) / 1000);
    const updated = await prisma.call.update({
      where: { id: req.params.id },
      data: { status: 'ENDED', endedAt: new Date(), durationSec },
    });
    res.json({ success: true, data: updated });
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = z.enum(['RINGING', 'ONGOING', 'MISSED', 'DECLINED', 'ENDED', 'FAILED']).parse(req.body.status);
    const updated = await prisma.call.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: updated });
  }),
);

export default router;
