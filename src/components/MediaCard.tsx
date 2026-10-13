import React, { useState, useRef, useEffect } from 'react';
import { Play, Download, Link2, Check, FileQuestion, MoreVertical, FileText, Calendar, HardDrive } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { formatBytes, formatRelativeTime, truncateFilename, isTouchDevice } from '../utils/formatters.ts';

interface MediaCardProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
  onCopyLink: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onOpen, onCopyLink }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Click outside listener to close three-dots dropdown
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col overflow-visible rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 cursor-pointer"
    >
      {/* Media Thumbnail / Video Module */}
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden rounded-t-xl">
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
      </div>

      {/* Card Body - Name, Date, and Three Dots Menu */}
      <div className="p-2.5 sm:p-3 relative">
        <div className="flex items-center justify-between gap-1.5">
          {/* File Name */}
          <h3
            title={item.originalFilename}
            className="text-xs sm:text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors flex-1"
          >
            {truncateFilename(item.originalFilename, 28)}
          </h3>

          {/* Three Dots Button */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={toggleMenu}
              title="Media options & details"
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

        {/* Upload Date (replacing size and format on the face of the card) */}
        <p className="mt-0.5 text-[10px] sm:text-xs text-zinc-500 font-mono tabular-nums">
          {formatRelativeTime(item.uploadedAt)}
        </p>
      </div>
    </div>
  );
};
