import nodemailer from 'nodemailer';
import { env, isProd } from '@/config/env';
import { logger } from '@/lib/logger';

const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    if (isProd) logger.warn('SMTP not configured; email not sent in production');
    logger.info({ to, subject, html }, '[dev email fallback] Email not actually sent');
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

export async function sendOtpEmail(to: string, code: string, purpose: string) {
  const subject = `MeCHAT verification code: ${code}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: auto;">
      <h2>MeCHAT</h2>
      <p>Your verification code (${purpose.replace(/_/g, ' ').toLowerCase()}) is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px;">${code}</p>
      <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>`;
  await sendEmail(to, subject, html);
}
