import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ShieldAlert, VolumeX } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';

interface MediaLightboxProps {
  item: MediaItem | null;
  onClose: () => void;
  onCopyPermanentLink?: (item: MediaItem) => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ item, onClose }) => {
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(item);
  const [isAutoMuted, setIsAutoMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Resolve media details if viewUrl is missing
  useEffect(() => {
    if (!item) {
      setResolvedItem(null);
      setIsAutoMuted(false);
      return;
    }

    setResolvedItem(item);

    if (!item.viewUrl) {
      fetch(`/api/resolve?key=${encodeURIComponent(item.key)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setResolvedItem((prev) => (prev ? { ...prev, ...data } : data));
          }
        })
        .catch(() => {});
    }
  }, [item]);

  // Reliable video autoplay helper
  const handlePlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // First attempt: try normal unmuted playback
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay policy blocked unmuted sound (common on direct links without prior interaction).
        // Fallback: mute audio and play immediately so video auto-starts seamlessly.
        video.muted = true;
        setIsAutoMuted(true);
        video.play().catch(() => {});
      });
    }
  }, []);

  useEffect(() => {
    if (resolvedItem?.type === 'video' && resolvedItem.viewUrl) {
      handlePlayVideo();
    }
  }, [resolvedItem?.viewUrl, resolvedItem?.type, handlePlayVideo]);

  if (!resolvedItem) return null;

  const currentItem = resolvedItem;

  return (
    <div
      onDoubleClick={onClose}
      className="fixed inset-0 z-50 w-screen h-screen bg-black flex items-center justify-center m-0 p-0 overflow-hidden select-none"
      title="Double-click anywhere to exit"
    >
      {/* Top-Right Cross Button to Close and Return to Main Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close (or double click screen)"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 rounded-full bg-black/70 hover:bg-black/95 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95 cursor-pointer shadow-lg"
      >
        <X className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>

      {/* Auto-Muted Notice (only shows if browser forced muted autoplay on direct link) */}
      {isAutoMuted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) {
              videoRef.current.muted = false;
              setIsAutoMuted(false);
            }
          }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white text-xs border border-zinc-700 backdrop-blur-md shadow-xl transition-all cursor-pointer"
        >
          <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
          <span>Click to unmute</span>
        </button>
      )}

      {/* Media Canvas - Edge to Edge / Border to Border */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        {currentItem.type === 'video' ? (
          <video
            ref={videoRef}
            key={currentItem.viewUrl}
            src={currentItem.viewUrl}
            controls
            autoPlay
            playsInline
            onLoadedMetadata={handlePlayVideo}
            onCanPlay={handlePlayVideo}
            onVolumeChange={() => {
              if (videoRef.current && !videoRef.current.muted) {
                setIsAutoMuted(false);
              }
            }}
            className="w-full h-full max-w-full max-h-full object-contain"
          />
        ) : currentItem.isSvg ? (
          <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <img
              src={currentItem.viewUrl}
              alt={currentItem.originalFilename}
              referrerPolicy="no-referrer"
              className="w-full h-full max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-6 flex items-center gap-1.5 text-xs text-amber-400 bg-black/80 border border-amber-800/60 px-3 py-1.5 rounded-full backdrop-blur-md">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Sandboxed SVG</span>
            </div>
          </div>
        ) : (
          <img
            src={currentItem.viewUrl}
            alt={currentItem.originalFilename}
            referrerPolicy="no-referrer"
            className="w-full h-full max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  );
};
