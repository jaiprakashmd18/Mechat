import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { fileReportSchema } from '@/validators/admin.validators';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = fileReportSchema.parse(req.body);
    const report = await prisma.report.create({ data: { reporterId: req.user!.id, ...data } });
    res.status(201).json({ success: true, data: report });
  }),
);

export default router;
