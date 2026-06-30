import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { updateSettingsSchema } from '@/validators/settings.validators';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id },
      update: {},
    });
    res.json({ success: true, data: settings });
  }),
);

router.patch(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateSettingsSchema.parse(req.body);
    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...data },
      update: data,
    });
    res.json({ success: true, data: settings });
  }),
);

router.get(
  '/storage-usage',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await prisma.media.aggregate({
      where: { uploaderId: req.user!.id },
      _sum: { fileSizeBytes: true },
      _count: true,
    });
    res.json({
      success: true,
      data: { totalBytes: result._sum.fileSizeBytes ?? 0, fileCount: result._count },
    });
  }),
);

export default router;
