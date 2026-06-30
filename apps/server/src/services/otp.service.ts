import { prisma } from '@/lib/prisma';
import { sha256 } from '@/services/encryption.service';
import { sendOtpEmail } from '@/services/email.service';
import type { OtpPurpose } from '@prisma/client';
import { ApiError } from '@/utils/ApiError';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function issueOtp(target: string, purpose: OtpPurpose, userId?: string) {
  const code = generateCode();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: { target, purpose, codeHash, expiresAt, userId },
  });

  if (target.includes('@')) {
    await sendOtpEmail(target, code, purpose);
  } else {
    // SMS provider integration point (Twilio/SNS). Logged for dev visibility.
    const { logger } = await import('@/lib/logger');
    logger.info({ target, code, purpose }, '[dev SMS fallback] OTP generated');
  }

  return { expiresAt };
}

export async function verifyOtp(target: string, purpose: OtpPurpose, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { target, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) throw ApiError.badRequest('No active verification code found, please request a new one');
  if (otp.expiresAt < new Date()) throw ApiError.badRequest('Verification code has expired');
  if (otp.attempts >= MAX_ATTEMPTS) throw ApiError.tooMany('Too many failed attempts, request a new code');

  if (otp.codeHash !== sha256(code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Invalid verification code');
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}
