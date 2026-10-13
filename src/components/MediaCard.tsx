import React, { useState, useRef, useEffect } from 'react';
import { Play, Download, Link2, Check, FileQuestion } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { formatBytes, formatRelativeTime, truncateFilename, isTouchDevice } from '../utils/formatters.ts';

interface MediaCardProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onCopyLink: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onOpen, onCopyLink }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isTouch = isTouchDevice();

  useEffect(() => {
    if (item.type !== 'video' || isTouch) return;

    if (isHovered && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, item.type, isTouch]);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 cursor-pointer"
    >
      {/* Media Canvas Area */}
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {item.type === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={item.viewUrl}
              preload="metadata"
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
            {/* Play badge indicator */}
            <div className={`absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] sm:text-[11px] font-mono text-zinc-300 backdrop-blur-sm transition-opacity ${isHovered && !isTouch ? 'opacity-0' : 'opacity-100'}`}>
              <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white" />
              <span>VIDEO</span>
            </div>
          </>
        ) : imgError ? (
          <div className="flex flex-col items-center justify-center p-3 text-center text-zinc-500">
            <FileQuestion className="w-6 h-6 mb-1" />
            <span className="text-[10px]">{item.extension.toUpperCase()}</span>
          </div>
        ) : (
          <img
            src={item.viewUrl}
            alt={item.originalFilename}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Floating Quick Action Buttons on Hover */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            title="Copy permanent share link"
            className="p-1 rounded bg-black/70 hover:bg-black text-zinc-300 hover:text-white backdrop-blur-sm transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link2 className="w-3 h-3" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download original file"
            className="p-1 rounded bg-black/70 hover:bg-black text-zinc-300 hover:text-white backdrop-blur-sm transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Card Body - Zero Pill Discipline */}
      <div className="p-2 sm:p-3">
        <h3
          title={item.originalFilename}
          className="text-xs sm:text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors"
        >
          {truncateFilename(item.originalFilename, 28)}
        </h3>

        {/* Clean unboxed metadata with typographic separators */}
        <div className="mt-0.5 sm:mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-zinc-500 font-mono tabular-nums">
          <span>{item.extension.toUpperCase()}</span>
          <span aria-hidden="true">·</span>
          <span>{formatBytes(item.size)}</span>
        </div>
      </div>
    </div>
  );
};
