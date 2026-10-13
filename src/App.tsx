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

  // Deep linking: check URL for ?v=key parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mediaKey = urlParams.get('v');
    if (mediaKey) {
      fetch(`/api/resolve?key=${encodeURIComponent(mediaKey)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setSelectedItem(data);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleOpenItem = (item: MediaItem) => {
    setSelectedItem(item);
    const url = new URL(window.location.href);
    url.searchParams.set('v', item.key);
    window.history.pushState({}, '', url.toString());
  };

  const handleCloseLightbox = () => {
    setSelectedItem(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('v');
    window.history.pushState({}, '', url.toString());
  };

  const handleCopyLink = (item: MediaItem) => {
    const permalink = `${window.location.origin}/?v=${encodeURIComponent(item.key)}`;
    navigator.clipboard.writeText(permalink);
    showToast(`Permanent share link copied to clipboard`);
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
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
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
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 sm:p-12 text-center max-w-sm sm:max-w-md mx-auto my-6 sm:my-12">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800/60 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto mb-3 sm:mb-4">
                  <Film className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white">No media found</h3>
                <p className="mt-1 text-[11px] sm:text-xs text-zinc-400">
                  {searchQuery
                    ? `No media matches "${searchQuery}".`
                    : 'Be the first to share an image or video to the gallery.'}
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-4 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white hover:bg-zinc-200 text-xs font-semibold text-zinc-950 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500 overflow-hidden">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
            <span className="font-semibold text-zinc-400">FlareMedia</span>
            <span>·</span>
            <span>Lossless Private S3 Media Hub</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-zinc-500 font-mono text-[11px] sm:text-xs">
            <span>Direct S3 Presigning</span>
            <span>·</span>
            <span>Zero Transcoding</span>
          </div>
        </div>
      </footer>

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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-xs text-white shadow-xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
