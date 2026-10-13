import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

export const b2Config = {
  endpoint: process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
  region: process.env.B2_REGION || 'eu-central-003',
  bucket: process.env.B2_BUCKET || 'Hmmmmmmmmm08',
  keyId: process.env.B2_KEY_ID || '0030f9c02ff0e7a0000000003',
  applicationKey: process.env.B2_APPLICATION_KEY || '',
  maxTotalStorageBytes: Number(process.env.MAX_TOTAL_STORAGE_BYTES) || 9500000000,
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
  appBaseUrl: process.env.APP_BASE_URL || '',
};

let clientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!clientInstance) {
    clientInstance = new S3Client({
      endpoint: b2Config.endpoint,
      region: b2Config.region,
      credentials: {
        accessKeyId: b2Config.keyId,
        secretAccessKey: b2Config.applicationKey,
      },
      forcePathStyle: true,
    });
  }
  return clientInstance;
}

export function isB2Configured(): boolean {
  return Boolean(b2Config.bucket && b2Config.keyId && b2Config.applicationKey);
}
