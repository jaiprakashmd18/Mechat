import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { authLimiter, otpLimiter } from '@/middleware/rateLimiter';
import { requireAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import {
  registerSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  twoFactorVerifySchema,
} from '@/validators/auth.validators';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  hashPassword,
  logAudit,
  REFRESH_TTL_MS,
} from '@/services/auth.service';
import { issueOtp, verifyOtp } from '@/services/otp.service';
import { isProd } from '@/config/env';

const router = Router();

const REFRESH_COOKIE = 'mechat_refresh_token';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: REFRESH_TTL_MS,
  path: '/api/auth',
};

function deviceFromReq(req: Request) {
  return {
    deviceId: req.body.deviceId,
    deviceName: req.body.deviceName,
    deviceType: req.body.deviceType,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

function publicUser(user: any) {
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new account (email or phone)
 *     tags: [Auth]
 */
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await registerUser({ ...data, device: deviceFromReq(req) });
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
    res.status(201).json({ success: true, data: { user: publicUser(user), accessToken } });
  }),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with username/email/phone + password (+ optional TOTP)
 *     tags: [Auth]
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await loginUser({ ...data, device: deviceFromReq(req) });

    if (result.requiresTwoFactor) {
      return res.status(200).json({ success: true, requiresTwoFactor: true, userId: result.userId });
    }

    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
    res.json({ success: true, data: { user: publicUser(result.user), accessToken: result.accessToken } });
  }),
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate access/refresh tokens using the httpOnly refresh cookie
 *     tags: [Auth]
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    if (!token) throw ApiError.unauthorized('Missing refresh token');

    const { accessToken, refreshToken, user } = await refreshSession(token, {
      deviceId: req.body.deviceId ?? 'unknown',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
    res.json({ success: true, data: { user: publicUser(user), accessToken } });
  }),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Revoke the current session
 *     tags: [Auth]
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refreshToken;
    if (token) await logoutSession(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ success: true });
  }),
);

/**
 * @openapi
 * /api/auth/otp/request:
 *   post:
 *     summary: Request an OTP code via email or SMS
 *     tags: [Auth]
 */
router.post(
  '/otp/request',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const { target, purpose } = otpRequestSchema.parse(req.body);
    const { expiresAt } = await issueOtp(target, purpose);
    res.json({ success: true, data: { expiresAt } });
  }),
);

/**
 * @openapi
 * /api/auth/otp/verify:
 *   post:
 *     summary: Verify an OTP code
 *     tags: [Auth]
 */
router.post(
  '/otp/verify',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const { target, purpose, code } = otpVerifySchema.parse(req.body);
    await verifyOtp(target, purpose, code);

    if (purpose === 'EMAIL_VERIFY' || purpose === 'PHONE_VERIFY') {
      const field = target.includes('@') ? { email: target } : { phone: target };
      await prisma.user.updateMany({
        where: field,
        data: target.includes('@') ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() },
      });
    }

    res.json({ success: true, verified: true });
  }),
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 */
router.post(
  '/forgot-password',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }, { username: identifier }] } });
    // Always return success to avoid user enumeration; only send OTP if found.
    if (user) {
      const target = user.email ?? user.phone ?? identifier;
      await issueOtp(target, 'PASSWORD_RESET', user.id);
    }
    res.json({ success: true, message: 'If an account exists, a reset code has been sent.' });
  }),
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a verified OTP code
 *     tags: [Auth]
 */
router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { identifier, code, newPassword } = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }, { username: identifier }] } });
    if (!user) throw ApiError.badRequest('Invalid request');

    const target = user.email ?? user.phone ?? identifier;
    await verifyOtp(target, 'PASSWORD_RESET', code);

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await logAudit(user.id, 'PASSWORD_RESET', { deviceId: 'n/a', userAgent: req.headers['user-agent'], ipAddress: req.ip });

    res.json({ success: true, message: 'Password reset successfully. Please log in again.' });
  }),
);

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Begin 2FA setup, returns TOTP secret + otpauth URI for QR code
 *     tags: [Auth]
 */
router.post(
  '/2fa/setup',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { secret, otpauth } = await setupTwoFactor(req.user!.id);
    res.json({ success: true, data: { secret, otpauth } });
  }),
);

/**
 * @openapi
 * /api/auth/2fa/confirm:
 *   post:
 *     summary: Confirm 2FA setup with a TOTP code to enable it
 *     tags: [Auth]
 */
router.post(
  '/2fa/confirm',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { code } = twoFactorVerifySchema.parse(req.body);
    await confirmTwoFactor(req.user!.id, code);
    await logAudit(req.user!.id, 'TWO_FA_ENABLED', { deviceId: req.user!.deviceId });
    res.json({ success: true });
  }),
);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     tags: [Auth]
 */
router.post(
  '/2fa/disable',
  requireAuth,
  asyncHandler(async (req, res) => {
    await disableTwoFactor(req.user!.id);
    await logAudit(req.user!.id, 'TWO_FA_DISABLED', { deviceId: req.user!.deviceId });
    res.json({ success: true });
  }),
);

/**
 * @openapi
 * /api/auth/sessions:
 *   get:
 *     summary: List this user's active sessions/devices
 *     tags: [Auth]
 */
router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceType: true,
        userAgent: true,
        ipAddress: true,
        isTrusted: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: sessions.map((s) => ({ ...s, isCurrent: s.deviceId === req.user!.deviceId })) });
  }),
);

/**
 * @openapi
 * /api/auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session (sign out a device)
 *     tags: [Auth]
 */
router.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.session.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { revokedAt: new Date() },
    });
    await logAudit(req.user!.id, 'DEVICE_REVOKED', { deviceId: req.user!.deviceId }, { revokedSessionId: req.params.id });
    res.json({ success: true });
  }),
);

/**
 * @openapi
 * /api/auth/sessions/{id}/trust:
 *   patch:
 *     summary: Mark a device/session as trusted
 *     tags: [Auth]
 */
router.patch(
  '/sessions/:id/trust',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.session.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isTrusted: true },
    });
    await logAudit(req.user!.id, 'DEVICE_TRUSTED', { deviceId: req.user!.deviceId });
    res.json({ success: true });
  }),
);

export default router;
