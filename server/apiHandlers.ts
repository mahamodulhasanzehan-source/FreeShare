import {
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, b2Config, isB2Configured } from './s3Client.ts';
import { encodeMediaKey, decodeMediaKey } from './keyCodec.ts';
import { verifyTurnstileToken } from './turnstile.ts';
import { validateFileType, validateFileSize, getBucketStorageUsage } from './storageLimits.ts';

export async function handleListMedia(params: {
  limit?: number;
  continuationToken?: string;
  filter?: string;
  sort?: string;
  search?: string;
}) {
  if (!isB2Configured()) {
    return {
      items: [],
      nextContinuationToken: null,
      configured: false,
      message: 'Backblaze B2 is not configured. Set B2_APPLICATION_KEY in .env.',
    };
  }

  const s3 = getS3Client();
  const limit = Math.min(Math.max(params.limit || 24, 1), 60);

  const command = new ListObjectsV2Command({
    Bucket: b2Config.bucket,
    Prefix: 'v1/',
    MaxKeys: 100, // Fetch up to 100 keys to account for client filtering
    ContinuationToken: params.continuationToken || undefined,
  });

  const response = await s3.send(command);
  const contents = response.Contents || [];

  const filter = params.filter || 'all';
  const search = (params.search || '').trim().toLowerCase();
  const sort = params.sort || 'newest';

  // Decode keys
  let decoded = contents.map((item) => {
    const meta = decodeMediaKey(item.Key || '', item.LastModified);
    return {
      ...meta,
      size: item.Size || 0,
      eTag: item.ETag || '',
    };
  });

  // Filter by media category
  if (filter === 'image') {
    decoded = decoded.filter((i) => i.type === 'image');
  } else if (filter === 'video') {
    decoded = decoded.filter((i) => i.type === 'video');
  }

  // Filter by search query
  if (search) {
    decoded = decoded.filter((i) => i.originalFilename.toLowerCase().includes(search));
  }

  // Sort if oldest is requested
  if (sort === 'oldest') {
    decoded.sort((a, b) => a.uploadedAt - b.uploadedAt);
  } else {
    // S3 v1 inverted keys are already newest first, but ensure strict sort
    decoded.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  // Slice to limit
  const pageItems = decoded.slice(0, limit);

  // Generate on-demand presigned view URLs ONLY for the page items
  const itemsWithUrls = await Promise.all(
    pageItems.map(async (item) => {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: b2Config.bucket,
          Key: item.key,
        });
        // Presign for 1 hour (3600s)
        const viewUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
        const isSvg = item.extension === 'svg';

        return {
          ...item,
          viewUrl,
          isSvg,
        };
      } catch (err) {
        return {
          ...item,
          viewUrl: '',
          isSvg: item.extension === 'svg',
        };
      }
    })
  );

  return {
    items: itemsWithUrls,
    nextContinuationToken: response.NextContinuationToken || null,
    configured: true,
  };
}

export async function handleResolveMedia(key: string) {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured.');
  }

  const s3 = getS3Client();

  // Verify object existence
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: b2Config.bucket,
      Key: key,
    })
  );

  const decoded = decodeMediaKey(key, head.LastModified);
  const cleanFilename = decoded.originalFilename.replace(/["\r\n]/g, '_');

  // Inline view URL
  const viewCommand = new GetObjectCommand({
    Bucket: b2Config.bucket,
    Key: key,
  });
  const viewUrl = await getSignedUrl(s3, viewCommand, { expiresIn: 3600 });

  // Download URL with attachment header forcing original filename
  const downloadCommand = new GetObjectCommand({
    Bucket: b2Config.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(cleanFilename)}"`,
  });
  const downloadUrl = await getSignedUrl(s3, downloadCommand, { expiresIn: 3600 });

  return {
    ...decoded,
    size: head.ContentLength || 0,
    contentType: head.ContentType || '',
    viewUrl,
    downloadUrl,
    isSvg: decoded.extension === 'svg',
  };
}

export async function handlePresignPut(body: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  turnstileToken?: string;
  remoteIp?: string;
}) {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured. Provide B2_APPLICATION_KEY.');
  }

  const turnstile = await verifyTurnstileToken(body.turnstileToken, body.remoteIp);
  if (!turnstile.success) {
    throw new Error(turnstile.error || 'Turnstile verification failed');
  }

  const typeCheck = validateFileType(body.mimeType, body.filename);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  const sizeCheck = validateFileSize(body.sizeBytes);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  const storage = await getBucketStorageUsage();
  if (storage.usedBytes + body.sizeBytes > storage.maxBytes) {
    throw new Error('Storage limit exceeded. Bucket has reached maximum capacity.');
  }

  const s3 = getS3Client();
  const { key, id, type } = encodeMediaKey(body.filename, body.mimeType);

  const putCommand = new PutObjectCommand({
    Bucket: b2Config.bucket,
    Key: key,
    ContentType: body.mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 900 });

  return {
    key,
    id,
    type,
    uploadUrl,
    method: 'PUT',
  };
}

export async function handleMultipartStart(body: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  turnstileToken?: string;
  remoteIp?: string;
}) {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured. Provide B2_APPLICATION_KEY.');
  }

  const turnstile = await verifyTurnstileToken(body.turnstileToken, body.remoteIp);
  if (!turnstile.success) {
    throw new Error(turnstile.error || 'Turnstile verification failed');
  }

  const typeCheck = validateFileType(body.mimeType, body.filename);
  if (!typeCheck.valid) {
    throw new Error(typeCheck.error);
  }

  const sizeCheck = validateFileSize(body.sizeBytes);
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error);
  }

  const storage = await getBucketStorageUsage();
  if (storage.usedBytes + body.sizeBytes > storage.maxBytes) {
    throw new Error('Storage limit exceeded. Bucket has reached maximum capacity.');
  }

  const s3 = getS3Client();
  const { key, id, type } = encodeMediaKey(body.filename, body.mimeType);

  const createCommand = new CreateMultipartUploadCommand({
    Bucket: b2Config.bucket,
    Key: key,
    ContentType: body.mimeType,
  });

  const response = await s3.send(createCommand);

  return {
    key,
    id,
    type,
    uploadId: response.UploadId,
  };
}

export async function handleMultipartSignPart(body: {
  key: string;
  uploadId: string;
  partNumber: number;
}) {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured.');
  }

  const s3 = getS3Client();
  const uploadPartCommand = new UploadPartCommand({
    Bucket: b2Config.bucket,
    Key: body.key,
    UploadId: body.uploadId,
    PartNumber: body.partNumber,
  });

  const uploadUrl = await getSignedUrl(s3, uploadPartCommand, { expiresIn: 900 });

  return {
    partNumber: body.partNumber,
    uploadUrl,
  };
}

export async function handleMultipartComplete(body: {
  key: string;
  uploadId: string;
  parts: Array<{ PartNumber: number; ETag: string }>;
}) {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured.');
  }

  const s3 = getS3Client();
  const sortedParts = [...body.parts].sort((a, b) => a.PartNumber - b.PartNumber);

  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: b2Config.bucket,
    Key: body.key,
    UploadId: body.uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });

  const response = await s3.send(completeCommand);

  return {
    success: true,
    location: response.Location,
    key: body.key,
  };
}

export async function handleMultipartAbort(body: {
  key: string;
  uploadId: string;
}) {
  if (!isB2Configured()) {
    return { aborted: false };
  }

  const s3 = getS3Client();
  const abortCommand = new AbortMultipartUploadCommand({
    Bucket: b2Config.bucket,
    Key: body.key,
    UploadId: body.uploadId,
  });

  await s3.send(abortCommand);
  return { aborted: true };
}

export async function handleStats() {
  const usage = await getBucketStorageUsage();
  return {
    ...usage,
    configured: isB2Configured(),
  };
}
