import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { GalleryControls } from './components/GalleryControls.tsx';
import { MediaCard } from './components/MediaCard.tsx';
import { MediaListItem } from './components/MediaListItem.tsx';
import { MediaLightbox } from './components/MediaLightbox.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import type { MediaItem, FilterCategory, SortOrder, ViewMode, StorageStats } from './types/media.ts';
import { Upload, Film, AlertTriangle, RefreshCw, Check } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  };

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        filter,
        sort,
        q: searchQuery,
      });
      const res = await fetch(`/api/media?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch media');
      }

      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Error loading gallery items');
    } finally {
      setLoading(false);
    }
  }, [filter, sort, searchQuery]);

  useEffect(() => {
    fetchMedia();
    fetchStats();
  }, [fetchMedia]);

  // Deep linking: check URL pathname (e.g. /1014.mp4) or fallback to query parameters
  useEffect(() => {
    let targetFilename = '';
    const rawPath = window.location.pathname.replace(/^\/+/, '');
    if (
      rawPath &&
      !rawPath.startsWith('api/') &&
      !rawPath.startsWith('src/') &&
      !rawPath.startsWith('@') &&
      rawPath !== 'index.html'
    ) {
      targetFilename = decodeURIComponent(rawPath);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v') || urlParams.get('file');
    const idParam = urlParams.get('id');

    if (targetFilename || vParam || idParam) {
      const query = new URLSearchParams();
      if (targetFilename) query.set('filename', targetFilename);
      if (vParam) query.set('v', vParam);
      if (idParam) query.set('id', idParam);

      fetch(`/api/resolve?${query.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setSelectedItem(data);
            // Sync browser URL cleanly to /{filename}
            if (data.originalFilename) {
              window.history.replaceState({}, '', `/${encodeURIComponent(data.originalFilename)}`);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const rawPath = window.location.pathname.replace(/^\/+/, '');
      if (!rawPath || rawPath === 'index.html') {
        setSelectedItem(null);
      } else {
        const filename = decodeURIComponent(rawPath);
        fetch(`/api/resolve?filename=${encodeURIComponent(filename)}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.error) setSelectedItem(data);
          })
          .catch(() => {});
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenItem = (item: MediaItem) => {
    setSelectedItem(item);
    window.history.pushState({}, '', `/${encodeURIComponent(item.originalFilename)}`);
  };

  const handleCloseLightbox = () => {
    setSelectedItem(null);
    window.history.pushState({}, '', '/');
  };

  const handleCopyLink = (item: MediaItem) => {
    const permalink = `${window.location.origin}/${encodeURIComponent(item.originalFilename)}`;
    navigator.clipboard.writeText(permalink);
    showToast(`Link copied: ${permalink}`);
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white">
      {/* Navigation */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onNavigateSection={handleScrollToSection}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 pt-2 pb-8 sm:pb-12 overflow-x-hidden">
        {/* Gallery Section */}
        <section id="gallery" className="mt-2">
          <GalleryControls
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalItems={items.length}
          />

          {/* Content Area */}
          <div className="mt-6">
            {loading ? (
              /* Skeleton Loader */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-xl bg-zinc-900 animate-pulse border border-zinc-800"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-8 text-center max-w-xl mx-auto my-12">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-rose-200">Unable to load media</h3>
                <p className="mt-1 text-xs text-zinc-400 font-mono">{error}</p>
                <button
                  onClick={fetchMedia}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 sm:p-12 text-center max-w-sm sm:max-w-md mx-auto my-8 sm:my-16 backdrop-blur-md shadow-2xl animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 mx-auto mb-4 shadow-inner">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">No media found</h3>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  {searchQuery
                    ? `No media matches "${searchQuery}".`
                    : 'Be the first to share an image or video to the gallery.'}
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-950 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_24px_rgba(255,255,255,0.2)] active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Media</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid Layout */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {items.map((item) => (
                  <MediaCard
                    key={item.key}
                    item={item}
                    onOpen={handleOpenItem}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            ) : (
              /* List Layout */
              <div className="space-y-2">
                {items.map((item) => (
                  <MediaListItem
                    key={item.key}
                    item={item}
                    onOpen={handleOpenItem}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      <MediaLightbox
        item={selectedItem}
        onClose={handleCloseLightbox}
        onCopyPermanentLink={handleCopyLink}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchMedia();
          fetchStats();
        }}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 flex items-center gap-2 rounded-full bg-zinc-900/90 border border-white/10 px-4 py-2 text-xs text-white shadow-2xl backdrop-blur-xl animate-fade-in whitespace-nowrap">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
