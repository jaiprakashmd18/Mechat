import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '@/lib/redis';
import { env } from '@/config/env';

function redisStoreFor(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<any>,
  });
}

/** General API rate limit applied globally. */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStoreFor('rl:api:'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Strict limiter for auth endpoints to mitigate brute-force/credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStoreFor('rl:auth:'),
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

/** Very strict limiter for OTP requests to prevent SMS/email bombing. */
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStoreFor('rl:otp:'),
  message: { success: false, message: 'Too many OTP requests, please wait before retrying.' },
});
