import React from 'react';
import { Search, LayoutGrid, List, SlidersHorizontal, Image as ImageIcon, Video as VideoIcon, Film, X } from 'lucide-react';
import type { FilterCategory, SortOrder, ViewMode } from '../types/media.ts';

interface GalleryControlsProps {
  filter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalItems: number;
}

export const GalleryControls: React.FC<GalleryControlsProps> = ({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  totalItems,
}) => {
  return (
    <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] w-full overflow-hidden">
      {/* Left: Filter Segmented Control & Item Count */}
      <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full md:w-auto">
        <div className="inline-flex rounded-xl bg-zinc-900/60 p-1 border border-white/[0.06] backdrop-blur-md shrink-0 shadow-inner">
          <button
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-zinc-800 text-white shadow-[0_1px_4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>All<span className="hidden sm:inline"> Media</span></span>
          </button>
          <button
            onClick={() => onFilterChange('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              filter === 'image'
                ? 'bg-zinc-800 text-white shadow-[0_1px_4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images</span>
          </button>
          <button
            onClick={() => onFilterChange('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              filter === 'video'
                ? 'bg-zinc-800 text-white shadow-[0_1px_4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5" />
            <span>Videos</span>
          </button>
        </div>

        <span className="text-[11px] sm:text-xs text-zinc-500 font-mono tabular-nums whitespace-nowrap shrink-0">
          {totalItems} {totalItems === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Right: Search, Sort & View Mode */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Search */}
        <div className="relative flex-1 min-w-0 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full h-9 rounded-xl border border-white/[0.08] bg-zinc-900/50 pl-8.5 pr-8 text-xs text-white placeholder-zinc-500 focus:border-white/25 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-white/15 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 h-9 text-xs text-zinc-400 bg-zinc-900/50 border border-white/[0.08] rounded-xl px-2.5 shrink-0 shadow-inner hover:border-white/20 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="bg-transparent text-zinc-300 hover:text-white focus:outline-none cursor-pointer text-xs"
          >
            <option value="newest" className="bg-zinc-900 text-white">Newest</option>
            <option value="oldest" className="bg-zinc-900 text-white">Oldest</option>
          </select>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex h-9 items-center rounded-xl bg-zinc-900/50 p-1 border border-white/[0.08] shrink-0 shadow-inner">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="List view"
            className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
