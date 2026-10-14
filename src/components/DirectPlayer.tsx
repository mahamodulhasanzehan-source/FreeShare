import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, ArrowLeft } from 'lucide-react';
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
  const [showExitHint, setShowExitHint] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowExitHint(false), 2600);
    return () => clearTimeout(timer);
  }, []);

  const attemptUnmutedPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const promise = video.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setNeedsGesture(false);
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
            setNeedsGesture(true);
            const resumeOnAction = () => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
                videoRef.current.play().catch(() => {});
              }
              setNeedsGesture(false);
              window.removeEventListener('pointerdown', resumeOnAction);
              window.removeEventListener('keydown', resumeOnAction);
              window.removeEventListener('touchstart', resumeOnAction);
            };

            window.addEventListener('pointerdown', resumeOnAction, { once: true });
            window.addEventListener('keydown', resumeOnAction, { once: true });
            window.addEventListener('touchstart', resumeOnAction, { once: true });
          }
        });
    }
  }, []);

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
      attemptUnmutedPlay();
    }
  }, [item?.viewUrl, item?.type, attemptUnmutedPlay]);

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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExitToMainMenu();
        }}
        aria-label="Exit to main menu"
        title="Exit to main menu (or double-click screen)"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white/90 hover:text-white backdrop-blur-xl border border-white/15 transition-all duration-200 active:scale-90 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div
        className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-zinc-900/75 border border-white/10 text-[11px] font-medium text-zinc-300 backdrop-blur-xl shadow-lg pointer-events-none transition-opacity duration-700 ${
          showExitHint ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Double-click anywhere or press Esc for main menu
      </div>

      {needsGesture && (
        <div
          onClick={() => {
            attemptUnmutedPlay();
            setNeedsGesture(false);
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-white text-zinc-950 font-medium text-xs shadow-2xl cursor-pointer hover:bg-zinc-200 transition-all animate-pulse"
        >
          Click anywhere to play with audio
        </div>
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
            onLoadedMetadata={attemptUnmutedPlay}
            onCanPlay={attemptUnmutedPlay}
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
