import type { UploadTask } from '../types/media.ts';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_CONCURRENT_PARTS = 3;
const MAX_RETRIES = 3;

export async function uploadSingleFile(
  task: UploadTask,
  turnstileToken: string | undefined,
  onProgress: (bytesUploaded: number, totalBytes: number, speed: number) => void
): Promise<{ key: string }> {
  // 1. Presign
  const res = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: task.file.name,
      mimeType: task.file.type || 'application/octet-stream',
      sizeBytes: task.file.size,
      turnstileToken,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to get upload authorization');
  }

  const { uploadUrl, key } = await res.json();
  const startTime = Date.now();

  // 2. Direct PUT to Backblaze
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    task.abortController?.signal.addEventListener('abort', () => xhr.abort());

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0 ? evt.loaded / elapsedSec : 0;
        onProgress(evt.loaded, evt.total, speed);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ key });
      } else {
        reject(new Error(`Backblaze upload error (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', task.file.type || 'application/octet-stream');
    xhr.send(task.file);
  });
}

export async function uploadMultipartFile(
  task: UploadTask,
  turnstileToken: string | undefined,
  onProgress: (bytesUploaded: number, totalBytes: number, speed: number) => void
): Promise<{ key: string }> {
  const file = task.file;
  const totalBytes = file.size;
  const numParts = Math.ceil(totalBytes / CHUNK_SIZE);

  // 1. Start multipart upload
  const startRes = await fetch('/api/upload/multipart/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: totalBytes,
      turnstileToken,
    }),
  });

  if (!startRes.ok) {
    const data = await startRes.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to initiate multipart upload');
  }

  const { key, uploadId } = await startRes.json();
  task.key = key;
  task.uploadId = uploadId;

  const partProgress = new Array(numParts).fill(0);
  const completedParts: Array<{ PartNumber: number; ETag: string }> = [];
  const startTime = Date.now();

  const updateAggregatedProgress = () => {
    const sum = partProgress.reduce((a, b) => a + b, 0);
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speed = elapsedSec > 0 ? sum / elapsedSec : 0;
    onProgress(sum, totalBytes, speed);
  };

  // Helper to upload a single part with retries
  const uploadPartWithRetry = async (partNumber: number): Promise<void> => {
    const startByte = (partNumber - 1) * CHUNK_SIZE;
    const endByte = Math.min(startByte + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(startByte, endByte);

    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (task.abortController?.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      try {
        // Sign part URL
        const signRes = await fetch('/api/upload/multipart/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, uploadId, partNumber }),
          signal: task.abortController?.signal,
        });

        if (!signRes.ok) {
          throw new Error(`Failed to sign part #${partNumber}`);
        }

        const { uploadUrl } = await signRes.json();

        // Upload chunk directly to B2
        const eTag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          task.abortController?.signal.addEventListener('abort', () => xhr.abort());

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              partProgress[partNumber - 1] = evt.loaded;
              updateAggregatedProgress();
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const rawEtag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
              const cleanedEtag = rawEtag.replace(/^"|"$/g, '');
              if (!cleanedEtag) {
                reject(new Error(`Missing ETag header on part #${partNumber}. Verify Backblaze bucket CORS exposes ETag.`));
              } else {
                resolve(cleanedEtag);
              }
            } else {
              reject(new Error(`Part #${partNumber} failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error on part #${partNumber}`));
          xhr.onabort = () => reject(new Error('Upload cancelled'));

          xhr.open('PUT', uploadUrl);
          xhr.send(chunk);
        });

        partProgress[partNumber - 1] = chunk.size;
        updateAggregatedProgress();
        completedParts.push({ PartNumber: partNumber, ETag: `"${eTag}"` });
        return;
      } catch (err: any) {
        lastError = err;
        if (task.abortController?.signal.aborted) {
          throw err;
        }
        // Wait exponential backoff before retry
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
      }
    }

    throw lastError || new Error(`Part #${partNumber} failed after ${MAX_RETRIES} attempts`);
  };

  // Concurrency queue runner
  const partIndices = Array.from({ length: numParts }, (_, i) => i + 1);
  let currentIndex = 0;
  let activeWorkers = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      let isDone = false;

      const launchNext = () => {
        if (isDone) return;
        if (task.abortController?.signal.aborted) {
          isDone = true;
          reject(new Error('Upload cancelled'));
          return;
        }
        if (currentIndex >= partIndices.length && activeWorkers === 0) {
          isDone = true;
          resolve();
          return;
        }

        while (activeWorkers < MAX_CONCURRENT_PARTS && currentIndex < partIndices.length) {
          const partNum = partIndices[currentIndex++];
          activeWorkers++;

          uploadPartWithRetry(partNum)
            .then(() => {
              activeWorkers--;
              launchNext();
            })
            .catch((err) => {
              if (!isDone) {
                isDone = true;
                reject(err);
              }
            });
        }
      };

      launchNext();
    });

    // 3. Complete multipart upload
    const completeRes = await fetch('/api/upload/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        uploadId,
        parts: completedParts,
      }),
    });

    if (!completeRes.ok) {
      const data = await completeRes.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to complete multipart upload');
    }

    return { key };
  } catch (err: any) {
    // Attempt abort cleanup on failure
    fetch('/api/upload/multipart/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => {});
    throw err;
  }
}
