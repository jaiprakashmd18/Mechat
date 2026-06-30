import crypto from 'node:crypto';
import { env } from '@/config/env';

/**
 * Field-level encryption at rest (AES-256-GCM).
 * Used for encrypting message ciphertext bodies and other sensitive
 * fields before they touch the database, on top of the client-side E2EE
 * envelope (clients encrypt with the recipient's public key; the server
 * additionally wraps stored ciphertext so a raw DB dump never yields
 * plaintext even if the field-level key were compromised separately
 * from the client keys).
 */
const ALGORITHM = 'aes-256-gcm';
const FIELD_KEY = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'hex'); // 32 bytes

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptField(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, FIELD_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptField(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, FIELD_KEY, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Generates an RSA-OAEP keypair used for E2EE key exchange (device public key registration). */
export function generateRsaKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/** Generates an Ed25519 keypair used for client-side message signing (non-repudiation). */
export function generateSigningKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

export function verifySignature(message: string, signatureBase64: string, signingPublicKeyPem: string): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(message, 'utf8'),
      signingPublicKeyPem,
      Buffer.from(signatureBase64, 'base64'),
    );
  } catch {
    return false;
  }
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
