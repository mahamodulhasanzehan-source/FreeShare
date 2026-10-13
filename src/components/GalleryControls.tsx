import React from 'react';
import { Search, LayoutGrid, List, SlidersHorizontal, Image as ImageIcon, Video as VideoIcon, Film } from 'lucide-react';
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
    <div className="flex flex-col gap-2.5 py-2.5 md:flex-row md:items-center md:justify-between border-b border-zinc-800 w-full overflow-hidden">
      {/* Left: Filter Segmented Control & Item Count */}
      <div className="flex items-center justify-between sm:justify-start gap-2 w-full md:w-auto">
        <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 shrink-0">
          <button
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>All<span className="hidden sm:inline"> Media</span></span>
          </button>
          <button
            onClick={() => onFilterChange('image')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === 'image'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Images</span>
          </button>
          <button
            onClick={() => onFilterChange('video')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === 'video'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <VideoIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 shrink-0">
          <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
          >
            <option value="newest" className="bg-zinc-900 text-white">Newest</option>
            <option value="oldest" className="bg-zinc-900 text-white">Oldest</option>
          </select>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex rounded-md bg-zinc-900 p-0.5 border border-zinc-800 shrink-0">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            className={`p-1 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="List view"
            className={`p-1 rounded transition-colors ${
              viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
