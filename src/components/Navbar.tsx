import React from 'react';
import { Upload } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, onNavigateSection }) => {

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-8 px-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => onNavigateSection('gallery')}
          className="text-sm sm:text-lg font-bold tracking-tight text-white hover:text-zinc-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2"
        >
          <span className="w-2 h-2 bg-white rounded-none rotate-45 shrink-0" aria-hidden="true" />
          <span>FlareMedia</span>
        </button>

        {/* Zone 2: Concise navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <button
            onClick={() => onNavigateSection('gallery')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Gallery
          </button>
        </nav>

        {/* Zone 3: 1 Primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-200 active:scale-95 transition-all rounded-md shadow-sm whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload<span className="hidden sm:inline"> Media</span></span>
          </button>
        </div>
      </div>
    </header>
  );
};
