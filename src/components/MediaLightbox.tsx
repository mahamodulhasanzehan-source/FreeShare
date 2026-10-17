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
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUnmute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1.0;
      setIsMuted(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 'm' && videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Resolve media details if viewUrl is missing
  useEffect(() => {
    if (!item) {
      setResolvedItem(null);
      return;
    }

    setResolvedItem(item);

    if (!item.viewUrl) {
      const q = new URLSearchParams();
      if (item.key) q.set('key', item.key);
      if (item.id) q.set('id', item.id);
      if (item.originalFilename) q.set('filename', item.originalFilename);

      fetch(`/api/resolve?${q.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setResolvedItem((prev) => (prev ? { ...prev, ...data } : data));
          }
        })
        .catch(() => {});
    }
  }, [item]);

  // Play video with audio (unmuted by default)
  const handlePlayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure audio is unmuted by default
    video.muted = false;
    video.volume = 1.0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
        })
        .catch((error) => {
          if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          }
        });
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVolumeChange = () => {
      setIsMuted(video.muted);
    };

    video.addEventListener('volumechange', onVolumeChange);
    return () => video.removeEventListener('volumechange', onVolumeChange);
  }, [resolvedItem?.viewUrl]);

  useEffect(() => {
    if (!isMuted) return;

    const onUserInteraction = () => {
      handleUnmute();
    };

    window.addEventListener('pointerdown', onUserInteraction, { once: true });
    window.addEventListener('touchstart', onUserInteraction, { once: true });
    window.addEventListener('keydown', onUserInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
    };
  }, [isMuted, handleUnmute]);

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
    >
      {/* Top-Right Cross Button to Close and Return to Main Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close viewer"
        title="Close (or double-click screen)"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all duration-200 active:scale-90 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Tap to unmute hint if video is muted by default due to device/browser policy */}
      {isMuted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnmute();
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs shadow-2xl cursor-pointer hover:bg-zinc-200 active:scale-95 transition-all animate-bounce"
        >
          <VolumeX className="w-4 h-4 text-zinc-900" />
          <span>Tap to unmute</span>
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
