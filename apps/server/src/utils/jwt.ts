import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string; // userId
  deviceId: string;
  isAdmin: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  deviceId: string;
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: jwt.SignOptions = { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  const options: jwt.SignOptions = { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
