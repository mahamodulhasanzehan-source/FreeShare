import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, ArrowLeft, VolumeX } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';

interface DirectPlayerProps {
  target: {
    filename?: string;
    key?: string;
    id?: string;
  };
  onExitToMainMenu: () => void;
}

export const DirectPlayer: React.FC<DirectPlayerProps> = ({ target, onExitToMainMenu }) => {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start unmuted with full volume by default
    video.muted = false;
    video.volume = 1.0;

    const promise = video.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsMuted(false);
        })
        .catch(() => {
          // If browser restricts unmuted autoplay (e.g. mobile Safari/Chrome policy),
          // play immediately so the video starts, and show the 'tap to unmute' hint
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
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
  }, [item?.viewUrl]);

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
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (target.filename) query.set('filename', target.filename);
    if (target.key) query.set('v', target.key);
    if (target.id) query.set('id', target.id);

    fetch(`/api/resolve?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('File not found');
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setItem(data);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load file');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [target.filename, target.key, target.id]);

  useEffect(() => {
    if (item?.type === 'video' && item.viewUrl) {
      attemptPlay();
    }
  }, [item?.viewUrl, item?.type, attemptPlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExitToMainMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitToMainMenu]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col items-center justify-center m-0 p-0 overflow-hidden select-none">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-white">Media Unavailable</h2>
          <p className="mt-1 text-xs text-zinc-400 font-mono">{error || 'The requested file could not be found.'}</p>
          <button
            onClick={onExitToMainMenu}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-all cursor-pointer active:scale-95 shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Main Menu</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={onExitToMainMenu}
      className="fixed inset-0 z-50 w-screen h-screen bg-black flex items-center justify-center m-0 p-0 overflow-hidden select-none"
    >
      {/* Top-Right Cross Button to Return to Main Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExitToMainMenu();
        }}
        aria-label="Exit to main menu"
        title="Exit to main menu"
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

      <div className="w-full h-full flex items-center justify-center bg-black">
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            key={item.viewUrl}
            src={item.viewUrl}
            controls
            autoPlay
            playsInline
            preload="auto"
            onLoadedMetadata={attemptPlay}
            onCanPlay={attemptPlay}
            className="w-full h-full max-w-full max-h-full object-contain"
          />
        ) : (
          <img
            src={item.viewUrl}
            alt={item.originalFilename}
            referrerPolicy="no-referrer"
            className="w-full h-full max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  );
};
