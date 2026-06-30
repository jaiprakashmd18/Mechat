import type { NextFunction, Request, Response } from 'express';
import { redis } from '@/lib/redis';
import { ApiError } from '@/utils/ApiError';

const BLOCKED_IPS_KEY = 'security:blocked_ips';

export async function ipGuard(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const blocked = await redis.sismember(BLOCKED_IPS_KEY, ip);
  if (blocked) return next(ApiError.forbidden('Your IP address has been blocked'));
  next();
}

export async function blockIp(ip: string) {
  await redis.sadd(BLOCKED_IPS_KEY, ip);
}

export async function unblockIp(ip: string) {
  await redis.srem(BLOCKED_IPS_KEY, ip);
}

export async function listBlockedIps(): Promise<string[]> {
  return redis.smembers(BLOCKED_IPS_KEY);
}
