import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { sha256, randomToken } from '@/services/encryption.service';
import { env } from '@/config/env';
import type { AuditAction } from '@prisma/client';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function logAudit(userId: string | null, action: AuditAction, device?: DeviceInfo, metadata?: object) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      ipAddress: device?.ipAddress,
      userAgent: device?.userAgent,
      metadata,
    },
  });
}

async function issueSession(userId: string, isAdmin: boolean, device: DeviceInfo) {
  const sessionId = randomToken(16);
  const refreshToken = signRefreshToken({ sub: userId, deviceId: device.deviceId, sessionId });
  const accessToken = signAccessToken({ sub: userId, deviceId: device.deviceId, isAdmin });

  await prisma.session.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId,
      refreshTokenHash: sha256(refreshToken),
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      userAgent: device.userAgent,
      ipAddress: device.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
    update: {},
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
  device: DeviceInfo;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: input.username }, ...(input.email ? [{ email: input.email }] : []), ...(input.phone ? [{ phone: input.phone }] : [])] },
  });
  if (existing) throw ApiError.conflict('Username, email, or phone is already in use');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      settings: { create: {} },
    },
  });

  const tokens = await issueSession(user.id, user.isAdmin, input.device);
  await logAudit(user.id, 'LOGIN_SUCCESS', input.device, { reason: 'registration' });

  return { user, ...tokens };
}

export async function loginUser(input: { identifier: string; password: string; device: DeviceInfo; totpCode?: string }) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: input.identifier }, { email: input.identifier }, { phone: input.identifier }] },
  });

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw ApiError.forbidden('Account temporarily locked due to too many failed attempts. Try again later.');
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : undefined,
      },
    });
    await logAudit(user.id, 'LOGIN_FAILED', input.device);
    if (shouldLock) await logAudit(user.id, 'ACCOUNT_LOCKED', input.device);
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (user.twoFactorEnabled) {
    if (!input.totpCode) {
      return { requiresTwoFactor: true as const, userId: user.id };
    }
    const isValidTotp = user.twoFactorSecret && authenticator.check(input.totpCode, user.twoFactorSecret);
    if (!isValidTotp) throw ApiError.unauthorized('Invalid two-factor code');
  }

  if (user.accountStatus !== 'ACTIVE') {
    throw ApiError.forbidden(`Account is ${user.accountStatus.toLowerCase()}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, status: 'ONLINE', lastSeenAt: new Date() },
  });

  const tokens = await issueSession(user.id, user.isAdmin, input.device);
  await logAudit(user.id, 'LOGIN_SUCCESS', input.device);

  return { requiresTwoFactor: false as const, user, ...tokens };
}

export async function refreshSession(refreshToken: string, device: DeviceInfo) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired or revoked');
  }
  if (session.refreshTokenHash !== sha256(refreshToken)) {
    // Token reuse detection: revoke the session outright.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    throw ApiError.unauthorized('Refresh token reuse detected, session revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw ApiError.unauthorized('User not found');

  // Rotate refresh token
  const newRefreshToken = signRefreshToken({ sub: user.id, deviceId: session.deviceId, sessionId: session.id });
  const newAccessToken = signAccessToken({ sub: user.id, deviceId: session.deviceId, isAdmin: user.isAdmin });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(newRefreshToken),
      lastUsedAt: new Date(),
      ipAddress: device.ipAddress ?? session.ipAddress,
      userAgent: device.userAgent ?? session.userAgent,
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

export async function logoutSession(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.session.updateMany({ where: { id: payload.sessionId }, data: { revokedAt: new Date() } });
  } catch {
    // already invalid; nothing to revoke
  }
}

export async function setupTwoFactor(userId: string) {
  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const otpauth = authenticator.keyuri(user.email ?? user.username, 'MeCHAT', secret);
  return { secret, otpauth };
}

export async function confirmTwoFactor(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorSecret || !authenticator.check(code, user.twoFactorSecret)) {
    throw ApiError.badRequest('Invalid two-factor code');
  }
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

export async function disableTwoFactor(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
}

export { REFRESH_TTL_MS, env };
