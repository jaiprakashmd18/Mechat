import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { createDirectChatSchema, updateChatSchema } from '@/validators/chat.validators';
import { decryptField } from '@/services/encryption.service';

const router = Router();

function decryptMessagePreview(message: any) {
  if (!message) return null;
  if (message.isDeleted) return { ...message, content: null };
  if (!message.ciphertext || !message.iv || !message.authTag) return { ...message, content: null };
  try {
    const content = decryptField({ ciphertext: message.ciphertext, iv: message.iv, authTag: message.authTag });
    return { ...message, content };
  } catch {
    return { ...message, content: null };
  }
}

async function assertParticipant(chatId: string, userId: string) {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!participant || participant.leftAt) throw ApiError.forbidden('You are not a participant of this chat');
  return participant;
}

/**
 * @openapi
 * /api/chats:
 *   get:
 *     summary: List the current user's chats (recent, with last message + unread count)
 *     tags: [Chats]
 *     parameters:
 *       - in: query
 *         name: archived
 *         schema: { type: boolean }
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const archived = req.query.archived === 'true';
    const participations = await prisma.chatParticipant.findMany({
      where: { userId: req.user!.id, isArchived: archived, leftAt: null },
      include: {
        chat: {
          include: {
            participants: {
              include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, lastSeenAt: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { chat: { updatedAt: 'desc' } },
    });

    const data = await Promise.all(
      participations.map(async (p) => {
        const unreadCount = await prisma.message.count({
          where: {
            chatId: p.chatId,
            senderId: { not: req.user!.id },
            isDeleted: false,
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        });
        return {
          id: p.chat.id,
          type: p.chat.type,
          name: p.chat.name,
          avatarUrl: p.chat.avatarUrl,
          wallpaperUrl: p.chat.wallpaperUrl,
          isPinned: p.isPinned,
          isArchived: p.isArchived,
          isMuted: p.isMuted,
          participants: p.chat.participants.map((cp) => ({ ...cp.user, role: cp.role })),
          lastMessage: decryptMessagePreview(p.chat.messages[0]),
          unreadCount,
          updatedAt: p.chat.updatedAt,
        };
      }),
    );

    data.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    res.json({ success: true, data });
  }),
);

/**
 * @openapi
 * /api/chats/direct:
 *   post:
 *     summary: Create or fetch a 1:1 chat with another user
 *     tags: [Chats]
 */
router.post(
  '/direct',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = createDirectChatSchema.parse(req.body);
    if (userId === req.user!.id) throw ApiError.badRequest('Cannot start a chat with yourself');

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw ApiError.notFound('User not found');

    const blocked = await prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: req.user!.id, blockedId: userId }, { blockerId: userId, blockedId: req.user!.id }] },
    });
    if (blocked) throw ApiError.forbidden('Cannot start a chat with this user');

    const existing = await prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        AND: [{ participants: { some: { userId: req.user!.id } } }, { participants: { some: { userId } } }],
      },
    });
    if (existing) return res.json({ success: true, data: existing });

    const chat = await prisma.chat.create({
      data: {
        type: 'DIRECT',
        createdById: req.user!.id,
        participants: { create: [{ userId: req.user!.id, role: 'MEMBER' }, { userId, role: 'MEMBER' }] },
      },
      include: { participants: true },
    });

    res.status(201).json({ success: true, data: chat });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.id, req.user!.id);
    const chat = await prisma.chat.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, lastSeenAt: true } } } },
      },
    });
    res.json({ success: true, data: chat });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.id, req.user!.id);
    const data = updateChatSchema.parse(req.body);

    if (data.wallpaperUrl !== undefined) {
      await prisma.chat.update({ where: { id: req.params.id }, data: { wallpaperUrl: data.wallpaperUrl } });
    }
    if (data.disappearingTtlSec !== undefined) {
      await prisma.chatParticipant.update({ where: { id: participant.id }, data: { disappearingTtlSec: data.disappearingTtlSec } });
    }
    res.json({ success: true });
  }),
);

router.patch(
  '/:id/pin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.id, req.user!.id);
    const updated = await prisma.chatParticipant.update({ where: { id: participant.id }, data: { isPinned: !participant.isPinned } });
    res.json({ success: true, data: { isPinned: updated.isPinned } });
  }),
);

router.patch(
  '/:id/archive',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.id, req.user!.id);
    const updated = await prisma.chatParticipant.update({ where: { id: participant.id }, data: { isArchived: !participant.isArchived } });
    res.json({ success: true, data: { isArchived: updated.isArchived } });
  }),
);

router.patch(
  '/:id/mute',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.id, req.user!.id);
    const mutedUntil = req.body.mutedUntil ? new Date(req.body.mutedUntil) : null;
    const updated = await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { isMuted: !participant.isMuted, mutedUntil },
    });
    res.json({ success: true, data: { isMuted: updated.isMuted, mutedUntil: updated.mutedUntil } });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.id, req.user!.id);
    await prisma.chatParticipant.update({ where: { id: participant.id }, data: { leftAt: new Date() } });
    res.json({ success: true });
  }),
);

router.get(
  '/:id/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.id, req.user!.id);
    const q = String(req.query.q ?? '').trim().toLowerCase();
    if (q.length < 2) return res.json({ success: true, data: [] });

    const messages = await prisma.message.findMany({
      where: { chatId: req.params.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const matches = messages
      .map(decryptMessagePreview)
      .filter((m) => m?.content?.toLowerCase().includes(q));

    res.json({ success: true, data: matches });
  }),
);

export default router;
