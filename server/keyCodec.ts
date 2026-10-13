export interface DecodedMediaKey {
  key: string;
  id: string;
  type: 'image' | 'video';
  originalFilename: string;
  uploadedAt: number;
  extension: string;
}

const BASE_INVERSION = 9999999999999;

export function encodeMediaKey(filename: string, mimeType: string): { key: string; id: string; type: 'image' | 'video' } {
  const isVideo = mimeType.startsWith('video/');
  const typeTag = isVideo ? 'vid' : 'img';
  const type: 'image' | 'video' = isVideo ? 'video' : 'image';

  const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : (isVideo ? 'mp4' : 'jpg');

  const now = Date.now();
  const invertedTs = String(BASE_INVERSION - now).padStart(13, '0');
  const id = Math.random().toString(36).substring(2, 10);
  const safeBase64Name = Buffer.from(filename).toString('base64url');

  const key = `v1/${invertedTs}_${typeTag}_${id}_${safeBase64Name}.${ext}`;

  return { key, id, type };
}

export function decodeMediaKey(key: string, s3LastModified?: Date): DecodedMediaKey {
  const match = key.match(/^v1\/(\d{13})_(img|vid)_([a-zA-Z0-9]+)_(.+)\.([a-zA-Z0-9]+)$/);

  if (match) {
    const [, invertedTs, typeTag, id, safeBase64Name, ext] = match;
    const uploadedAt = BASE_INVERSION - Number(invertedTs);
    let originalFilename: string;
    try {
      originalFilename = Buffer.from(safeBase64Name, 'base64url').toString('utf-8');
    } catch {
      originalFilename = `file_${id}.${ext}`;
    }

    return {
      key,
      id,
      type: typeTag === 'vid' ? 'video' : 'image',
      originalFilename,
      uploadedAt: isNaN(uploadedAt) ? (s3LastModified?.getTime() || Date.now()) : uploadedAt,
      extension: ext.toLowerCase(),
    };
  }

  // Fallback for non-v1 keys
  const id = Math.random().toString(36).substring(2, 10);
  const cleanName = key.split('/').pop() || key;
  const isVideo = /\.(mp4|webm|mov|mkv)$/i.test(cleanName);
  const ext = (cleanName.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();

  return {
    key,
    id,
    type: isVideo ? 'video' : 'image',
    originalFilename: cleanName,
    uploadedAt: s3LastModified?.getTime() || Date.now(),
    extension: ext,
  };
}
