import React, { useState, useRef, useEffect } from 'react';
import { Download, Link2, Check, Video, MoreVertical, HardDrive, FileText, Calendar } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { formatBytes, formatRelativeTime } from '../utils/formatters.ts';

interface MediaListItemProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onCopyLink: (item: MediaItem) => void;
}

export const MediaListItem: React.FC<MediaListItemProps> = ({ item, onOpen, onCopyLink }) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink(item);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1500);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
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

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  return (
    <div
      onClick={() => onOpen(item)}
      className="group relative flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700 transition-colors cursor-pointer"
    >
      {/* Left: Thumbnail & Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative h-10 w-14 sm:h-12 sm:w-16 shrink-0 rounded bg-zinc-950 overflow-hidden flex items-center justify-center border border-zinc-800">
          {item.type === 'video' ? (
            <div className="flex items-center justify-center text-zinc-500">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
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
          <p className="text-xs sm:text-sm font-medium text-zinc-200 truncate group-hover:text-white">
            {item.originalFilename}
          </p>
          <p className="text-[10px] sm:text-xs text-zinc-500 font-mono tabular-nums mt-0.5">
            {formatRelativeTime(item.uploadedAt)}
          </p>
        </div>
      </div>

      {/* Right: Three Dots Menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={toggleMenu}
          title="Details and options"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 bottom-full mb-1.5 z-40 w-52 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-2 text-xs text-zinc-300 backdrop-blur-md animate-fade-in"
          >
            {/* Details Section */}
            <div className="space-y-1.5 pb-2 border-b border-zinc-800 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <HardDrive className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Size: <strong className="text-zinc-200 tabular-nums">{formatBytes(item.size)}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Format: <strong className="text-zinc-200">{item.extension.toUpperCase()}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>Uploaded: <strong className="text-zinc-200">{formatRelativeTime(item.uploadedAt)}</strong></span>
              </div>
            </div>

            {/* Actions Section */}
            <div className="pt-1.5 space-y-1">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-left text-zinc-200 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-left text-zinc-200 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Download Original</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
