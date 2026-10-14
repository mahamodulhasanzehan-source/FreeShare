import React from 'react';
import { Upload } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, onNavigateSection }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-zinc-950/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-8 px-3.5 sm:px-6 lg:px-8">
        {/* Brand wordmark */}
        <button
          onClick={() => onNavigateSection('gallery')}
          className="group text-base sm:text-lg font-bold tracking-tight text-white hover:text-zinc-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/15 flex items-center justify-center shadow-inner group-hover:border-white/30 transition-colors">
            <span className="w-2 h-2 bg-gradient-to-br from-white to-zinc-400 rounded-[1px] rotate-45 shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          </div>
          <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent font-bold">FlareMedia</span>
        </button>

        {/* Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenUpload}
            className="group flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-[0.98] transition-all duration-200 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:shadow-[0_0_28px_rgba(255,255,255,0.25)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span>Upload<span className="hidden sm:inline"> Media</span></span>
          </button>
        </div>
      </div>
    </header>
  );
};
