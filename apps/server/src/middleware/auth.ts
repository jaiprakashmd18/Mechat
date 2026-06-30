import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/utils/ApiError';
import { verifyAccessToken } from '@/utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; deviceId: string; isAdmin: boolean };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) return next(ApiError.unauthorized('Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, deviceId: payload.deviceId, isAdmin: payload.isAdmin };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return next(ApiError.forbidden('Admin access required'));
  next();
}

/** Attaches req.user if a valid token is present, but does not reject otherwise. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, deviceId: payload.deviceId, isAdmin: payload.isAdmin };
  } catch {
    // ignore invalid token in optional mode
  }
  next();
}
