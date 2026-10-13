export interface MediaItem {
  key: string;
  id: string;
  type: 'image' | 'video';
  originalFilename: string;
  uploadedAt: number;
  extension: string;
  size: number;
  viewUrl?: string;
  downloadUrl?: string;
  isSvg: boolean;
  eTag?: string;
}

export type UploadStatus =
  | 'queued'
  | 'presigning'
  | 'uploading'
  | 'completing'
  | 'done'
  | 'error'
  | 'aborted';

export interface UploadTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  speedBytesPerSec: number;
  errorMsg?: string;
  mode: 'single' | 'multipart';
  key?: string;
  uploadId?: string;
  abortController?: AbortController;
}

export type FilterCategory = 'all' | 'image' | 'video';
export type SortOrder = 'newest' | 'oldest';
export type ViewMode = 'grid' | 'list';

export interface StorageStats {
  usedBytes: number;
  maxBytes: number;
  fileCount: number;
  configured: boolean;
}
