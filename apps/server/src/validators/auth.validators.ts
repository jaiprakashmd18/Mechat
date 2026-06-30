import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username may only contain letters, numbers, underscores and dots'),
  displayName: z.string().min(1).max(64),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  deviceType: z.enum(['web', 'android', 'ios', 'desktop']).optional(),
}).refine((data) => data.email || data.phone, { message: 'Email or phone is required' });

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  deviceType: z.enum(['web', 'android', 'ios', 'desktop']).optional(),
});

export const otpRequestSchema = z.object({
  target: z.string().min(3),
  purpose: z.enum(['SIGNUP', 'LOGIN', 'PASSWORD_RESET', 'TWO_FACTOR', 'PHONE_VERIFY', 'EMAIL_VERIFY']),
});

export const otpVerifySchema = otpRequestSchema.extend({
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const twoFactorVerifySchema = z.object({
  code: z.string().length(6),
});
