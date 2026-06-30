import { Router } from 'express';
import QRCode from 'qrcode';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { updateProfileSchema, registerDeviceKeySchema } from '@/validators/user.validators';
import { logAudit } from '@/services/auth.service';

const router = Router();

function publicUser(user: any) {
  const { passwordHash, twoFactorSecret, failedLoginCount, lockedUntil, ...safe } = user;
  return safe;
}

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { settings: true },
    });
    res.json({ success: true, data: publicUser(user) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    await logAudit(req.user!.id, 'PROFILE_UPDATE', { deviceId: req.user!.deviceId });
    res.json({ success: true, data: publicUser(user) });
  }),
);

router.get(
  '/me/qrcode',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const payload = JSON.stringify({ type: 'mechat-user', uniqueUserId: user.uniqueUserId });
    const dataUrl = await QRCode.toDataURL(payload);
    res.json({ success: true, data: { qrCode: dataUrl, uniqueUserId: user.uniqueUserId } });
  }),
);

router.get(
  '/me/audit-logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  }),
);

router.get(
  '/me/blocked',
  requireAuth,
  asyncHandler(async (req, res) => {
    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: req.user!.id },
      include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: blocked.map((b) => b.blocked) });
  }),
);

router.post(
  '/block/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw ApiError.badRequest('Cannot block yourself');
    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: req.params.id } },
      create: { blockerId: req.user!.id, blockedId: req.params.id },
      update: {},
    });
    res.json({ success: true });
  }),
);

router.delete(
  '/block/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.blockedUser.deleteMany({ where: { blockerId: req.user!.id, blockedId: req.params.id } });
    res.json({ success: true });
  }),
);

router.post(
  '/me/keys',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = registerDeviceKeySchema.parse(req.body);
    const key = await prisma.deviceKey.upsert({
      where: { userId_deviceId: { userId: req.user!.id, deviceId: data.deviceId } },
      create: { userId: req.user!.id, ...data },
      update: { publicKey: data.publicKey, signingPublicKey: data.signingPublicKey, rotatedAt: new Date(), isActive: true },
    });
    await logAudit(req.user!.id, 'KEY_ROTATED', { deviceId: req.user!.deviceId });
    res.json({ success: true, data: key });
  }),
);

router.get(
  '/:id/keys',
  requireAuth,
  asyncHandler(async (req, res) => {
    const keys = await prisma.deviceKey.findMany({
      where: { userId: req.params.id, isActive: true },
      select: { deviceId: true, publicKey: true, signingPublicKey: true, algorithm: true },
    });
    res.json({ success: true, data: keys });
  }),
);

router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user!.id } },
          { accountStatus: 'ACTIVE' },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { uniqueUserId: q },
            ],
          },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, statusMessage: true, status: true },
      take: 20,
    });
    res.json({ success: true, data: users });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        status: true,
        statusMessage: true,
        lastSeenAt: true,
        uniqueUserId: true,
        createdAt: true,
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, data: user });
  }),
);

router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { accountStatus: 'DELETED', deletedAt: new Date(), email: null, phone: null },
    });
    await prisma.session.updateMany({ where: { userId: req.user!.id }, data: { revokedAt: new Date() } });
    await logAudit(req.user!.id, 'ACCOUNT_DELETE', { deviceId: req.user!.deviceId });
    res.clearCookie('mechat_refresh_token', { path: '/api/auth' });
    res.json({ success: true });
  }),
);

router.get(
  '/me/export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: {
        chatParticipants: true,
        messagesSent: true,
        settings: true,
        mediaFiles: { select: { id: true, fileName: true, url: true, createdAt: true } },
      },
    });
    const { passwordHash, twoFactorSecret, ...safe } = data;
    res.setHeader('Content-Disposition', 'attachment; filename="mechat-export.json"');
    await logAudit(req.user!.id, 'DATA_EXPORT', { deviceId: req.user!.deviceId });
    res.json(safe);
  }),
);

export default router;
