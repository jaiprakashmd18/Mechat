import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

function createClient(name: string) {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  });
  client.on('error', (err) => logger.error({ err, client: name }, 'Redis client error'));
  client.on('connect', () => logger.info(`Redis client "${name}" connected`));
  return client;
}

export const redis = createClient('main');
// Socket.IO redis adapter requires two dedicated connections (pub/sub).
export const redisPub = createClient('pub');
export const redisSub = createClient('sub');
