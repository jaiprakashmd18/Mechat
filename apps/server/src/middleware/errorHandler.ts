import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/lib/logger';
import { isProd } from '@/config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isProd ? {} : { stack: (err as Error)?.stack }),
  });
}
