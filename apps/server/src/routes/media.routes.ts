import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { storeFile, deleteFile } from '@/services/upload.service';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  // images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // video
  'video/mp4', 'video/webm', 'video/quicktime',
  // audio / voice notes
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
  // documents
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(415, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

/**
 * @openapi
 * /api/media/upload:
 *   post:
 *     summary: Upload a single file (image, video, audio, voice note, or document) and attach it to a message
 *     tags: [Media]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 */
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No file uploaded');

    const stored = await storeFile(req.file.buffer, req.file.originalname, req.file.mimetype, req.user!.id);

    const media = await prisma.media.create({
      data: {
        uploaderId: req.user!.id,
        url: stored.url,
        storageKey: stored.storageKey,
        storageType: stored.storageType,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
      },
    });

    res.status(201).json({ success: true, data: media });
  }),
);

router.post(
  '/upload-multi',
  requireAuth,
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) throw ApiError.badRequest('No files uploaded');

    const media = await Promise.all(
      files.map(async (file) => {
        const stored = await storeFile(file.buffer, file.originalname, file.mimetype, req.user!.id);
        return prisma.media.create({
          data: {
            uploaderId: req.user!.id,
            url: stored.url,
            storageKey: stored.storageKey,
            storageType: stored.storageType,
            mimeType: file.mimetype,
            fileName: file.originalname,
            fileSizeBytes: file.size,
          },
        });
      }),
    );

    res.status(201).json({ success: true, data: media });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUniqueOrThrow({ where: { id: req.params.id } });
    if (media.uploaderId !== req.user!.id) throw ApiError.forbidden('Not the owner of this file');
    await deleteFile(media.storageKey, media.storageType as 'local' | 's3');
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  '/chat/:chatId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId: req.params.chatId, userId: req.user!.id } },
    });
    if (!participant) throw ApiError.forbidden('Not a participant of this chat');

    const category = String(req.query.category ?? 'media'); // media | documents | links | audio
    const mimeFilter: Record<string, string[]> = {
      media: ['image/', 'video/'],
      audio: ['audio/'],
      documents: ['application/', 'text/'],
    };

    const media = await prisma.media.findMany({
      where: {
        message: { chatId: req.params.chatId, isDeleted: false },
        ...(mimeFilter[category]
          ? { OR: mimeFilter[category].map((prefix) => ({ mimeType: { startsWith: prefix } })) }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: media });
  }),
);

export default router;
