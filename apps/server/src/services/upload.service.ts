import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '@/config/env';

const s3Client =
  env.STORAGE_DRIVER === 's3'
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        credentials:
          env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
            : undefined,
      })
    : null;

export interface StoredFile {
  storageKey: string;
  storageType: 'local' | 's3';
  url: string;
}

function buildObjectKey(originalName: string, userId: string) {
  const ext = path.extname(originalName);
  const id = crypto.randomBytes(16).toString('hex');
  return `${userId}/${Date.now()}-${id}${ext}`;
}

export async function storeFile(buffer: Buffer, originalName: string, mimeType: string, userId: string): Promise<StoredFile> {
  const key = buildObjectKey(originalName, userId);

  if (env.STORAGE_DRIVER === 's3' && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    const url = env.S3_PUBLIC_URL ? `${env.S3_PUBLIC_URL}/${key}` : key;
    return { storageKey: key, storageType: 's3', url };
  }

  const uploadDir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
  const fullPath = path.join(uploadDir, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { storageKey: key, storageType: 'local', url: `/uploads/${key}` };
}

export async function deleteFile(storageKey: string, storageType: 'local' | 's3') {
  if (storageType === 's3' && s3Client) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }));
    return;
  }
  const fullPath = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR, storageKey);
  await fs.rm(fullPath, { force: true });
}

export async function getPresignedUploadUrl(key: string, mimeType: string) {
  if (!s3Client) throw new Error('S3 storage driver is not configured');
  const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: mimeType });
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}
