import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
    res.json({ success: true, data: notifications, unreadCount });
  }),
);

router.patch(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isRead: true } });
    res.json({ success: true });
  }),
);

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    res.json({ success: true });
  }),
);

export default router;
