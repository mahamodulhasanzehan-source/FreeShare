import React, { useState } from 'react';
import { Download, Link2, Check, Video, Image as ImageIcon } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { formatBytes, formatRelativeTime } from '../utils/formatters.ts';

interface MediaListItemProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onCopyLink: (item: MediaItem) => void;
}

export const MediaListItem: React.FC<MediaListItemProps> = ({ item, onOpen, onCopyLink }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink(item);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = item.originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (item.viewUrl) {
      window.open(item.viewUrl, '_blank');
    }
  };

  return (
    <div
      onClick={() => onOpen(item)}
      className="group flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700 transition-colors cursor-pointer"
    >
      {/* Left: Thumbnail & Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative h-12 w-16 shrink-0 rounded bg-zinc-950 overflow-hidden flex items-center justify-center border border-zinc-800">
          {item.type === 'video' ? (
            <div className="flex items-center justify-center text-zinc-500">
              <Video className="w-5 h-5" />
            </div>
          ) : (
            <img
              src={item.viewUrl}
              alt={item.originalFilename}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">
            {item.originalFilename}
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono tabular-nums">
            <span>{item.extension.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(item.size)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(item.uploadedAt)}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCopy}
          title="Copy permanent share link"
          className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
        </button>
        <button
          onClick={handleDownload}
          title="Download original file"
          className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
