import { PrismaClient } from '@prisma/client';
import { isProd } from '@/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: isProd ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!isProd) global.__prisma__ = prisma;
