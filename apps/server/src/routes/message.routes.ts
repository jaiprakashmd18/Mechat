import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { encryptField, decryptField } from '@/services/encryption.service';
import { emitToChat, emitToUser } from '@/sockets/emitter';
import {
  sendMessageSchema,
  editMessageSchema,
  scheduleMessageSchema,
  reactSchema,
} from '@/validators/message.validators';
import { xss } from '@/utils/sanitize';

const router = Router();

async function assertParticipant(chatId: string, userId: string) {
  const participant = await prisma.chatParticipant.findUnique({ where: { chatId_userId: { chatId, userId } } });
  if (!participant || participant.leftAt) throw ApiError.forbidden('You are not a participant of this chat');
  return participant;
}

function decryptMessage(message: any) {
  if (message.isDeleted) return { ...message, content: null };
  if (!message.ciphertext || !message.iv || !message.authTag) return { ...message, content: null };
  try {
    return { ...message, content: decryptField({ ciphertext: message.ciphertext, iv: message.iv, authTag: message.authTag }) };
  } catch {
    return { ...message, content: null };
  }
}

const messageInclude = {
  sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  attachments: true,
  reactions: { include: { user: { select: { id: true, username: true, displayName: true } } } },
  receipts: true,
  poll: { include: { options: { include: { votes: true } } } },
  replyTo: { include: { sender: { select: { id: true, username: true, displayName: true } } } },
} as const;

/**
 * @openapi
 * /api/messages/{chatId}:
 *   get:
 *     summary: Paginated message history for a chat (cursor-based, newest first then reversed)
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 */
router.get(
  '/:chatId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.chatId, req.user!.id);
    const limit = Math.min(Number(req.query.limit ?? 30), 100);
    const cursor = req.query.cursor as string | undefined;

    const messages = await prisma.message.findMany({
      where: { chatId: req.params.chatId },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json({
      success: true,
      data: messages.map(decryptMessage).reverse(),
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
    });
  }),
);

/**
 * @openapi
 * /api/messages:
 *   post:
 *     summary: Send a message (text, media, location, contact, or poll) to a chat
 *     tags: [Messages]
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = sendMessageSchema.parse(req.body);
    await assertParticipant(data.chatId, req.user!.id);

    const sanitizedContent = data.content ? xss(data.content) : undefined;
    const encrypted = sanitizedContent ? encryptField(sanitizedContent) : undefined;

    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: data.chatId, userId: req.user!.id } },
    });
    const expiresAt = participant?.disappearingTtlSec
      ? new Date(Date.now() + participant.disappearingTtlSec * 1000)
      : undefined;

    const message = await prisma.message.create({
      data: {
        chatId: data.chatId,
        senderId: req.user!.id,
        type: data.type,
        ciphertext: encrypted?.ciphertext,
        iv: encrypted?.iv,
        authTag: encrypted?.authTag,
        signature: data.signature,
        replyToId: data.replyToId,
        forwardedFromId: data.forwardedFromId,
        mentions: data.mentions ?? [],
        expiresAt,
        ...(data.mediaIds?.length ? { attachments: { connect: data.mediaIds.map((id) => ({ id })) } } : {}),
        ...(data.poll
          ? {
              poll: {
                create: {
                  question: data.poll.question,
                  allowsMultiple: data.poll.allowsMultiple ?? false,
                  closesAt: data.poll.closesAt ? new Date(data.poll.closesAt) : undefined,
                  options: { create: data.poll.options.map((text) => ({ text })) },
                },
              },
            }
          : {}),
      },
      include: messageInclude,
    });

    await prisma.chat.update({ where: { id: data.chatId }, data: { updatedAt: new Date() } });

    const participants = await prisma.chatParticipant.findMany({
      where: { chatId: data.chatId, leftAt: null },
    });
    await prisma.messageReceipt.createMany({
      data: participants
        .filter((p) => p.userId !== req.user!.id)
        .map((p) => ({ messageId: message.id, userId: p.userId, status: 'SENT' as const })),
    });

    const decrypted = decryptMessage(message);
    emitToChat(data.chatId, 'message:new', decrypted);

    for (const p of participants) {
      if (p.userId !== req.user!.id) {
        emitToUser(p.userId, 'notification:new', {
          type: 'MESSAGE',
          chatId: data.chatId,
          messageId: message.id,
          preview: decrypted.content?.slice(0, 120) ?? `[${data.type}]`,
        });
      }
    }

    res.status(201).json({ success: true, data: decrypted });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { content } = editMessageSchema.parse(req.body);
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });
    if (message.senderId !== req.user!.id) throw ApiError.forbidden('Only the sender can edit this message');
    if (message.isDeleted) throw ApiError.badRequest('Cannot edit a deleted message');

    const encrypted = encryptField(xss(content));
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { ciphertext: encrypted.ciphertext, iv: encrypted.iv, authTag: encrypted.authTag, isEdited: true, editedAt: new Date() },
      include: messageInclude,
    });

    const decrypted = decryptMessage(updated);
    emitToChat(message.chatId, 'message:edited', decrypted);
    res.json({ success: true, data: decrypted });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const forEveryone = req.query.forEveryone === 'true';
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });

    if (forEveryone && message.senderId !== req.user!.id) {
      throw ApiError.forbidden('Only the sender can delete this message for everyone');
    }
    await assertParticipant(message.chatId, req.user!.id);

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { isDeleted: true, deletedForAll: forEveryone, ciphertext: null, iv: null, authTag: null },
    });

    emitToChat(message.chatId, 'message:deleted', { id: updated.id, chatId: message.chatId, forEveryone });
    res.json({ success: true });
  }),
);

router.post(
  '/:id/star',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.starredMessage.upsert({
      where: { messageId_userId: { messageId: req.params.id, userId: req.user!.id } },
      create: { messageId: req.params.id, userId: req.user!.id },
      update: {},
    });
    res.json({ success: true });
  }),
);

router.delete(
  '/:id/star',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.starredMessage.deleteMany({ where: { messageId: req.params.id, userId: req.user!.id } });
    res.json({ success: true });
  }),
);

router.get(
  '/starred/all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const starred = await prisma.starredMessage.findMany({
      where: { userId: req.user!.id },
      include: { message: { include: messageInclude } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: starred.map((s) => decryptMessage(s.message)) });
  }),
);

router.patch(
  '/:id/pin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });
    await assertParticipant(message.chatId, req.user!.id);
    const updated = await prisma.message.update({ where: { id: req.params.id }, data: { isPinned: !message.isPinned } });
    emitToChat(message.chatId, 'message:pinned', { id: updated.id, isPinned: updated.isPinned });
    res.json({ success: true, data: { isPinned: updated.isPinned } });
  }),
);

router.post(
  '/:id/react',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { emoji } = reactSchema.parse(req.body);
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });
    await assertParticipant(message.chatId, req.user!.id);

    const reaction = await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: req.params.id, userId: req.user!.id, emoji } },
      create: { messageId: req.params.id, userId: req.user!.id, emoji },
      update: {},
    });

    emitToChat(message.chatId, 'message:reaction', { messageId: req.params.id, userId: req.user!.id, emoji, action: 'add' });
    res.json({ success: true, data: reaction });
  }),
);

router.delete(
  '/:id/react/:emoji',
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });
    await prisma.messageReaction.deleteMany({
      where: { messageId: req.params.id, userId: req.user!.id, emoji: decodeURIComponent(req.params.emoji) },
    });
    emitToChat(message.chatId, 'message:reaction', {
      messageId: req.params.id,
      userId: req.user!.id,
      emoji: decodeURIComponent(req.params.emoji),
      action: 'remove',
    });
    res.json({ success: true });
  }),
);

router.post(
  '/:id/poll/vote',
  requireAuth,
  asyncHandler(async (req, res) => {
    const optionId = String(req.body.optionId);
    const message = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id }, include: { poll: true } });
    if (!message.poll) throw ApiError.badRequest('This message is not a poll');
    await assertParticipant(message.chatId, req.user!.id);

    if (!message.poll.allowsMultiple) {
      await prisma.pollVote.deleteMany({ where: { userId: req.user!.id, option: { pollId: message.poll.id } } });
    }
    await prisma.pollVote.upsert({
      where: { optionId_userId: { optionId, userId: req.user!.id } },
      create: { optionId, userId: req.user!.id },
      update: {},
    });

    emitToChat(message.chatId, 'message:poll-vote', { messageId: message.id, optionId, userId: req.user!.id });
    res.json({ success: true });
  }),
);

router.post(
  '/:id/forward',
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetChatIds: string[] = req.body.chatIds ?? [];
    const original = await prisma.message.findUniqueOrThrow({ where: { id: req.params.id } });

    const forwarded = await Promise.all(
      targetChatIds.map(async (chatId) => {
        await assertParticipant(chatId, req.user!.id);
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: req.user!.id,
            type: original.type,
            ciphertext: original.ciphertext,
            iv: original.iv,
            authTag: original.authTag,
            forwardedFromId: original.id,
          },
          include: messageInclude,
        });
        const decrypted = decryptMessage(message);
        emitToChat(chatId, 'message:new', decrypted);
        return decrypted;
      }),
    );

    res.json({ success: true, data: forwarded });
  }),
);

router.post(
  '/:chatId/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await assertParticipant(req.params.chatId, req.user!.id);
    await prisma.chatParticipant.update({ where: { id: participant.id }, data: { lastReadAt: new Date() } });
    await prisma.messageReceipt.updateMany({
      where: { userId: req.user!.id, message: { chatId: req.params.chatId }, status: { not: 'SEEN' } },
      data: { status: 'SEEN' },
    });
    emitToChat(req.params.chatId, 'message:seen', { chatId: req.params.chatId, userId: req.user!.id, at: new Date() });
    res.json({ success: true });
  }),
);

router.post(
  '/scheduled',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = scheduleMessageSchema.parse(req.body);
    await assertParticipant(data.chatId, req.user!.id);
    const encrypted = encryptField(xss(data.content));

    const scheduled = await prisma.scheduledMessage.create({
      data: {
        chatId: data.chatId,
        userId: req.user!.id,
        type: data.type,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        scheduledAt: new Date(data.scheduledAt),
      },
    });
    res.status(201).json({ success: true, data: scheduled });
  }),
);

router.get(
  '/scheduled/:chatId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.chatId, req.user!.id);
    const scheduled = await prisma.scheduledMessage.findMany({
      where: { chatId: req.params.chatId, userId: req.user!.id, sentAt: null, cancelledAt: null },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json({
      success: true,
      data: scheduled.map((s) => ({ ...s, content: decryptField({ ciphertext: s.ciphertext, iv: s.iv, authTag: s.authTag }) })),
    });
  }),
);

router.delete(
  '/scheduled/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.scheduledMessage.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { cancelledAt: new Date() },
    });
    res.json({ success: true });
  }),
);

export default router;
