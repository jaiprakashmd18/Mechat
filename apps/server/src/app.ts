import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { env, isProd } from '@/config/env';
import { logger } from '@/lib/logger';
import { apiLimiter } from '@/middleware/rateLimiter';
import { ipGuard } from '@/middleware/ipGuard';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { swaggerSpec } from '@/docs/swagger';

import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import chatRoutes from '@/routes/chat.routes';
import messageRoutes from '@/routes/message.routes';
import groupRoutes from '@/routes/group.routes';
import mediaRoutes from '@/routes/media.routes';
import notificationRoutes from '@/routes/notification.routes';
import callRoutes from '@/routes/call.routes';
import adminRoutes from '@/routes/admin.routes';
import settingsRoutes from '@/routes/settings.routes';
import reportRoutes from '@/routes/report.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  // ── Security headers ────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'blob:', '*'],
              mediaSrc: ["'self'", 'blob:', '*'],
              connectSrc: ["'self'", env.CLIENT_URL],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(hpp()); // HTTP parameter pollution protection
  app.use(pinoHttp({ logger, autoLogging: !isProd }));
  app.use(ipGuard);
  app.use('/api', apiLimiter);

  // Local upload static serving (when STORAGE_DRIVER=local)
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR)));

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/calls', callRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
