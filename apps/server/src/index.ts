import 'dotenv/config';
import http from 'node:http';
import { createApp } from '@/app';
import { initSocketServer } from '@/sockets';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis, redisPub, redisSub } from '@/lib/redis';

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  initSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(`MeCHAT API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs available at ${env.API_URL}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => logger.info('HTTP server closed'));
    await Promise.allSettled([prisma.$disconnect(), redis.quit(), redisPub.quit(), redisSub.quit()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled rejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
