import React, { useState, useEffect } from 'react';
import { X, Download, Link2, Check, Share2, ZoomIn, ZoomOut, Info, ShieldAlert } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { formatBytes, formatRelativeTime } from '../utils/formatters.ts';

interface MediaLightboxProps {
  item: MediaItem | null;
  onClose: () => void;
  onCopyPermanentLink: (item: MediaItem) => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ item, onClose, onCopyPermanentLink }) => {
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(item);
  const [loading, setLoading] = useState(false);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Resolve fresh download/view URL if item does not have downloadUrl
  useEffect(() => {
    if (!item) {
      setResolvedItem(null);
      return;
    }

    setResolvedItem(item);

    if (!item.downloadUrl) {
      setLoading(true);
      fetch(`/api/resolve?key=${encodeURIComponent(item.key)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setResolvedItem((prev) => (prev ? { ...prev, ...data } : data));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [item]);

  if (!resolvedItem) return null;

  const currentItem = resolvedItem;
  const permanentUrl = `${window.location.origin}/?v=${encodeURIComponent(currentItem.key)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(permanentUrl);
    setCopied(true);
    onCopyPermanentLink(currentItem);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const url = currentItem.downloadUrl || currentItem.viewUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = currentItem.originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-h-[96vh] w-full max-w-6xl rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <h2 className="text-sm font-semibold text-white truncate" title={currentItem.originalFilename}>
              {currentItem.originalFilename}
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums shrink-0">
              <span>{currentItem.extension.toUpperCase()}</span>
              <span>·</span>
              <span>{formatBytes(currentItem.size)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentItem.type === 'image' && !currentItem.isSvg && (
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? 'Fit to screen' : 'Zoom 1:1'}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share Link'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-xs font-semibold text-zinc-950 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Original</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Viewing Canvas */}
        <div className="relative flex-1 min-h-[300px] max-h-[70vh] flex items-center justify-center bg-black overflow-auto p-2">
          {currentItem.type === 'video' ? (
            <video
              src={currentItem.viewUrl}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-md shadow-lg"
            />
          ) : currentItem.isSvg ? (
            <div className="flex flex-col items-center justify-center p-6 max-h-full">
              {/* Sandboxed SVG using img tag to strictly prevent script injection */}
              <img
                src={currentItem.viewUrl}
                alt={currentItem.originalFilename}
                referrerPolicy="no-referrer"
                className="max-h-[50vh] max-w-full object-contain"
              />
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SVG rendered in sandboxed image container (scripts blocked)</span>
              </div>
            </div>
          ) : (
            <img
              src={currentItem.viewUrl}
              alt={currentItem.originalFilename}
              referrerPolicy="no-referrer"
              className={`rounded-md transition-all ${
                isZoomed ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          )}
        </div>

        {/* Bottom Technical Metadata & Share Bar */}
        <div className="border-t border-zinc-800/80 bg-zinc-900/50 p-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums">
            <span>Size: {formatBytes(currentItem.size)}</span>
            <span>·</span>
            <span>Uploaded: {formatRelativeTime(currentItem.uploadedAt)}</span>
            <span>·</span>
            <span>Format: {currentItem.extension.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <span className="text-zinc-500 shrink-0">Permanent URL:</span>
            <input
              type="text"
              readOnly
              value={permanentUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full sm:w-64 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300 font-mono text-[11px] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
