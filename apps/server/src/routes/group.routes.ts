import { Router } from 'express';
import { nanoid } from 'nanoid';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  changeRoleSchema,
  createInviteSchema,
} from '@/validators/group.validators';
import { emitToChat, emitToUser } from '@/sockets/emitter';

const router = Router();

const MANAGE_ROLES = ['OWNER', 'ADMIN'] as const;

async function requireGroupRole(chatId: string, userId: string, roles: readonly string[]) {
  const participant = await prisma.chatParticipant.findUnique({ where: { chatId_userId: { chatId, userId } } });
  if (!participant || participant.leftAt) throw ApiError.forbidden('Not a member of this group');
  if (!roles.includes(participant.role)) throw ApiError.forbidden('Insufficient permissions');
  return participant;
}

/**
 * @openapi
 * /api/groups:
 *   post:
 *     summary: Create a new group chat with initial members
 *     tags: [Groups]
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = createGroupSchema.parse(req.body);
    const memberIds = Array.from(new Set(data.memberIds.filter((id) => id !== req.user!.id)));

    const chat = await prisma.chat.create({
      data: {
        type: 'GROUP',
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        createdById: req.user!.id,
        participants: {
          create: [
            { userId: req.user!.id, role: 'OWNER' },
            ...memberIds.map((userId) => ({ userId, role: 'MEMBER' as const })),
          ],
        },
      },
      include: { participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } } },
    });

    for (const userId of memberIds) {
      emitToUser(userId, 'group:added', { chatId: chat.id, name: chat.name });
    }

    res.status(201).json({ success: true, data: chat });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireGroupRole(req.params.id, req.user!.id, MANAGE_ROLES);
    const data = updateGroupSchema.parse(req.body);
    const chat = await prisma.chat.update({ where: { id: req.params.id }, data });
    emitToChat(req.params.id, 'group:updated', chat);
    res.json({ success: true, data: chat });
  }),
);

router.post(
  '/:id/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireGroupRole(req.params.id, req.user!.id, MANAGE_ROLES);
    const { memberIds } = addMembersSchema.parse(req.body);

    await prisma.$transaction(
      memberIds.map((userId) =>
        prisma.chatParticipant.upsert({
          where: { chatId_userId: { chatId: req.params.id, userId } },
          create: { chatId: req.params.id, userId, role: 'MEMBER' },
          update: { leftAt: null },
        }),
      ),
    );

    for (const userId of memberIds) emitToUser(userId, 'group:added', { chatId: req.params.id });
    emitToChat(req.params.id, 'group:members-added', { chatId: req.params.id, memberIds });
    res.json({ success: true });
  }),
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const actor = await requireGroupRole(req.params.id, req.user!.id, MANAGE_ROLES);
    const target = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: req.params.id, userId: req.params.userId } },
    });
    if (!target) throw ApiError.notFound('Member not found');
    if (target.role === 'OWNER') throw ApiError.forbidden('Cannot remove the group owner');
    if (actor.role === 'ADMIN' && target.role === 'ADMIN') throw ApiError.forbidden('Admins cannot remove other admins');

    await prisma.chatParticipant.update({ where: { id: target.id }, data: { leftAt: new Date() } });
    emitToChat(req.params.id, 'group:member-removed', { chatId: req.params.id, userId: req.params.userId });
    res.json({ success: true });
  }),
);

router.patch(
  '/:id/members/:userId/role',
  requireAuth,
  asyncHandler(async (req, res) => {
    const actor = await requireGroupRole(req.params.id, req.user!.id, ['OWNER']);
    const { role } = changeRoleSchema.parse(req.body);
    if (role === 'OWNER' && actor.userId !== req.params.userId) {
      // Transfer ownership: demote current owner to admin.
      await prisma.chatParticipant.update({ where: { id: actor.id }, data: { role: 'ADMIN' } });
    }
    const updated = await prisma.chatParticipant.update({
      where: { chatId_userId: { chatId: req.params.id, userId: req.params.userId } },
      data: { role },
    });
    emitToChat(req.params.id, 'group:role-changed', { chatId: req.params.id, userId: req.params.userId, role: updated.role });
    res.json({ success: true, data: updated });
  }),
);

router.post(
  '/:id/leave',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await requireGroupRole(req.params.id, req.user!.id, ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER']);
    if (participant.role === 'OWNER') {
      const nextOwner = await prisma.chatParticipant.findFirst({
        where: { chatId: req.params.id, userId: { not: req.user!.id }, leftAt: null },
        orderBy: { role: 'asc' },
      });
      if (nextOwner) await prisma.chatParticipant.update({ where: { id: nextOwner.id }, data: { role: 'OWNER' } });
    }
    await prisma.chatParticipant.update({ where: { id: participant.id }, data: { leftAt: new Date() } });
    emitToChat(req.params.id, 'group:member-left', { chatId: req.params.id, userId: req.user!.id });
    res.json({ success: true });
  }),
);

router.post(
  '/:id/invites',
  requireAuth,
  asyncHandler(async (req, res) => {
    await requireGroupRole(req.params.id, req.user!.id, MANAGE_ROLES);
    const data = createInviteSchema.parse(req.body);
    const invite = await prisma.groupInvite.create({
      data: {
        chatId: req.params.id,
        code: nanoid(12),
        createdById: req.user!.id,
        maxUses: data.maxUses,
        expiresAt: data.expiresInHours ? new Date(Date.now() + data.expiresInHours * 3600 * 1000) : undefined,
      },
    });
    res.status(201).json({ success: true, data: invite });
  }),
);

router.get(
  '/invites/:code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invite = await prisma.groupInvite.findUnique({
      where: { code: req.params.code },
      include: { chat: { select: { id: true, name: true, avatarUrl: true, description: true } } },
    });
    if (!invite || invite.revokedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw ApiError.notFound('Invite is invalid or has expired');
    }
    res.json({ success: true, data: invite });
  }),
);

router.post(
  '/invites/:code/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invite = await prisma.groupInvite.findUnique({ where: { code: req.params.code } });
    if (!invite || invite.revokedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
      throw ApiError.notFound('Invite is invalid or has expired');
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) throw ApiError.forbidden('Invite link has reached its usage limit');

    await prisma.$transaction([
      prisma.chatParticipant.upsert({
        where: { chatId_userId: { chatId: invite.chatId, userId: req.user!.id } },
        create: { chatId: invite.chatId, userId: req.user!.id, role: 'MEMBER' },
        update: { leftAt: null },
      }),
      prisma.groupInvite.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } }),
    ]);

    emitToChat(invite.chatId, 'group:member-joined', { chatId: invite.chatId, userId: req.user!.id });
    res.json({ success: true, data: { chatId: invite.chatId } });
  }),
);

export default router;
