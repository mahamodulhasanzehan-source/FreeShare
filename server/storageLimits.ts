import { ListObjectsV2Command, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { getS3Client, b2Config, isB2Configured } from './s3Client.ts';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/ogg',
]);

const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB hard ceiling per file

export function validateFileType(mimeType: string, filename: string): { valid: boolean; error?: string } {
  const normalizedMime = mimeType.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return { valid: true };
  }

  // Fallback by extension check
  const ext = (filename.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'mp4', 'webm', 'mov', 'mkv'];
  if (allowedExtensions.includes(ext)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Unsupported file type: ${mimeType || ext}. Only images and videos are allowed.`,
  };
}

export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File size must be greater than 0 bytes' };
  }
  if (sizeBytes > MAX_SINGLE_FILE_BYTES) {
    return { valid: false, error: 'File size exceeds maximum supported limit (5 GB)' };
  }
  return { valid: true };
}

export async function getBucketStorageUsage(): Promise<{ usedBytes: number; maxBytes: number; fileCount: number }> {
  if (!isB2Configured()) {
    return { usedBytes: 0, maxBytes: b2Config.maxTotalStorageBytes, fileCount: 0 };
  }

  try {
    const s3 = getS3Client();
    let totalBytes = 0;
    let fileCount = 0;
    let continuationToken: string | undefined = undefined;

    do {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: b2Config.bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });
      const response: ListObjectsV2CommandOutput = await s3.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          totalBytes += item.Size || 0;
          fileCount++;
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return {
      usedBytes: totalBytes,
      maxBytes: b2Config.maxTotalStorageBytes,
      fileCount,
    };
  } catch (err) {
    return { usedBytes: 0, maxBytes: b2Config.maxTotalStorageBytes, fileCount: 0 };
  }
}
