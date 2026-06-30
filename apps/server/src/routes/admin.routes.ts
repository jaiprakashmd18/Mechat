import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth, requireAdmin } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { updateAccountStatusSchema, resolveReportSchema } from '@/validators/admin.validators';
import { logAudit } from '@/services/auth.service';
import { blockIp, unblockIp, listBlockedIps } from '@/middleware/ipGuard';
import { z } from 'zod';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [userCount, activeUserCount, messageCount, groupCount, mediaAgg, callCount, pendingReports, bannedCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ONLINE' } }),
      prisma.message.count(),
      prisma.chat.count({ where: { type: 'GROUP' } }),
      prisma.media.aggregate({ _sum: { fileSizeBytes: true }, _count: true }),
      prisma.call.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { accountStatus: 'BANNED' } }),
    ]);

    res.json({
      success: true,
      data: {
        users: { total: userCount, online: activeUserCount, banned: bannedCount },
        messages: { total: messageCount },
        groups: { total: groupCount },
        calls: { total: callCount },
        storage: { totalBytes: mediaAgg._sum.fileSizeBytes ?? 0, fileCount: mediaAgg._count },
        reports: { pending: pendingReports },
      },
    });
  }),
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 25), 100);
    const q = String(req.query.q ?? '').trim();

    const where = q
      ? { OR: [{ username: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, displayName: true, email: true, phone: true,
          accountStatus: true, isAdmin: true, createdAt: true, lastSeenAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  }),
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const { accountStatus, reason } = updateAccountStatusSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { accountStatus } });

    if (accountStatus !== 'ACTIVE') {
      await prisma.session.updateMany({ where: { userId: req.params.id }, data: { revokedAt: new Date() } });
    }

    const action = accountStatus === 'BANNED' ? 'ACCOUNT_BANNED' : accountStatus === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_BANNED';
    await logAudit(req.params.id, action, { deviceId: 'admin-action' }, { byAdminId: req.user!.id, reason });

    res.json({ success: true, data: user });
  }),
);

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const reports = await prisma.report.findMany({
      where: status ? { status: status as any } : {},
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        reportedUser: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: reports });
  }),
);

router.patch(
  '/reports/:id',
  asyncHandler(async (req, res) => {
    const { status, resolutionNote } = resolveReportSchema.parse(req.body);
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, resolutionNote, resolvedById: req.user!.id, resolvedAt: new Date() },
    });
    res.json({ success: true, data: report });
  }),
);

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    const logs = await prisma.auditLog.findMany({
      where: userId ? { userId } : {},
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: logs });
  }),
);

router.get(
  '/storage',
  asyncHandler(async (_req, res) => {
    const byType = await prisma.media.groupBy({
      by: ['storageType'],
      _sum: { fileSizeBytes: true },
      _count: true,
    });
    res.json({ success: true, data: byType });
  }),
);

router.get(
  '/blocked-ips',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await listBlockedIps() });
  }),
);

router.post(
  '/blocked-ips',
  asyncHandler(async (req, res) => {
    const { ip } = z.object({ ip: z.string().min(1) }).parse(req.body);
    await blockIp(ip);
    res.json({ success: true });
  }),
);

router.delete(
  '/blocked-ips/:ip',
  asyncHandler(async (req, res) => {
    await unblockIp(req.params.ip);
    res.json({ success: true });
  }),
);

export default router;
