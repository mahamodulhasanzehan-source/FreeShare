import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileUp, AlertCircle, CheckCircle2, RotateCcw, Shield, Layers } from 'lucide-react';
import type { UploadTask } from '../types/media.ts';
import { formatBytes, formatSpeed, truncateFilename } from '../utils/formatters.ts';
import { uploadSingleFile, uploadMultipartFile } from '../utils/s3Uploader.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const siteKey = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '';

  // Initialize Turnstile widget if site key exists
  useEffect(() => {
    if (!isOpen || !siteKey || !(window as any).turnstile) return;

    const timer = setTimeout(() => {
      if (turnstileContainerRef.current) {
        turnstileContainerRef.current.innerHTML = '';
        try {
          (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              setTurnstileToken(token);
            },
          });
        } catch (e) {}
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, siteKey]);

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newTasks: UploadTask[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      status: 'queued',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      speedBytesPerSec: 0,
      mode: file.size > 10 * 1024 * 1024 ? 'multipart' : 'single',
      abortController: new AbortController(),
    }));

    setTasks((prev) => [...prev, ...newTasks]);
    newTasks.forEach((task) => startUpload(task));
  };

  const startUpload = async (task: UploadTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading', errorMsg: undefined } : t))
    );

    const onProgress = (uploaded: number, total: number, speed: number) => {
      const pct = Math.min(Math.round((uploaded / total) * 100), 100);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, progress: pct, bytesUploaded: uploaded, speedBytesPerSec: speed }
            : t
        )
      );
    };

    try {
      if (task.mode === 'multipart') {
        await uploadMultipartFile(task, turnstileToken, onProgress);
      } else {
        await uploadSingleFile(task, turnstileToken, onProgress);
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'done', progress: 100 } : t))
      );
      onUploadSuccess();
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: 'error', errorMsg: err.message || 'Upload failed' } : t
        )
      );
    }
  };

  const retryTask = (task: UploadTask) => {
    const updated = {
      ...task,
      status: 'queued' as const,
      progress: 0,
      bytesUploaded: 0,
      abortController: new AbortController(),
    };
    startUpload(updated);
  };

  const cancelTask = (task: UploadTask) => {
    task.abortController?.abort();
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 bg-zinc-900/60">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Upload Media</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct upload to Backblaze B2. Original bytes preserved with zero transcoding.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
              isDragging
                ? 'border-white bg-zinc-900/80 scale-[0.99]'
                : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.svg"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
            <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-white mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-white text-center">
              Drop images or videos here, or <span className="text-zinc-300 underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1 text-center font-mono">
              JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, MOV · Up to 5 GB
            </p>
          </div>

          {/* Turnstile Container (if key exists) */}
          {siteKey && (
            <div className="flex justify-center py-1">
              <div ref={turnstileContainerRef} />
            </div>
          )}

          {/* Upload Queue List */}
          {tasks.length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Upload Queue ({tasks.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-medium text-zinc-200 truncate">
                          {truncateFilename(task.file.name, 30)}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                          {task.mode === 'multipart' ? '10MB S3 Multi-Part' : 'Direct PUT'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === 'uploading' && (
                          <span className="font-mono text-zinc-400 text-[11px] tabular-nums">
                            {formatSpeed(task.speedBytesPerSec)} · {task.progress}%
                          </span>
                        )}
                        {task.status === 'done' && (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </span>
                        )}
                        {task.status === 'error' && (
                          <span className="flex items-center gap-1 text-rose-400 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                        {task.status === 'error' && (
                          <button
                            onClick={() => retryTask(task)}
                            title="Retry upload"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => cancelTask(task)}
                          title="Cancel"
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          task.status === 'done'
                            ? 'bg-emerald-500'
                            : task.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-white'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    {task.errorMsg && (
                      <p className="text-[11px] text-rose-400 font-mono">{task.errorMsg}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Notice */}
        <div className="border-t border-zinc-800 bg-zinc-900/40 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span><span className="hidden sm:inline">Transfers travel directly to Backblaze. </span>No account required.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors shrink-0 ml-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
