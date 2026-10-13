import React from 'react';
import { HardDrive, ShieldCheck, Database, Zap } from 'lucide-react';
import type { StorageStats } from '../types/media.ts';
import { formatBytes } from '../utils/formatters.ts';

interface StorageStatsBarProps {
  stats: StorageStats | null;
  onOpenUpload: () => void;
}

export const StorageStatsBar: React.FC<StorageStatsBarProps> = ({ stats, onOpenUpload }) => {
  if (!stats) return null;

  const percentUsed = stats.maxBytes > 0
    ? Math.min(Math.round((stats.usedBytes / stats.maxBytes) * 100), 100)
    : 0;

  return (
    <div id="storage-info" className="my-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Capacity Meter */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              <HardDrive className="w-4 h-4 text-zinc-400" />
              <span>Backblaze B2 Storage Consumption</span>
            </span>
            <span className="font-mono text-zinc-400 tabular-nums">
              {formatBytes(stats.usedBytes)} of {formatBytes(stats.maxBytes)} ({percentUsed}%)
            </span>
          </div>

          <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentUsed > 90 ? 'bg-rose-500' : percentUsed > 75 ? 'bg-amber-400' : 'bg-white'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Right: Architecture Highlights */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400 pt-2 lg:pt-0 border-t border-zinc-800 lg:border-t-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>Files: <strong className="text-white font-mono">{stats.fileCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Private Bucket with Temporary Access</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Direct S3 Presigned Transfers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
