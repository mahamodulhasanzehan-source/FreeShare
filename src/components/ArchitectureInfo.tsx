import React from 'react';
import { Shield, Zap, Lock, RefreshCw, EyeOff, Server } from 'lucide-react';

export const ArchitectureInfo: React.FC = () => {
  return (
    <section id="security" className="my-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 md:p-8">
      <div className="max-w-2xl">
        <h2 className="text-lg font-bold text-white tracking-tight">
          Zero-Account Anonymous Media Architecture
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Designed for maximum privacy and performance. Backblaze B2 is the single source of truth.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <Lock className="w-4 h-4 text-zinc-400" />
            <span>Private Storage by Default</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Backblaze bucket is completely private. Access URLs are generated on-demand with short lifespans (1 hour), preventing public bucket scraping or credential exposure.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <Zap className="w-4 h-4 text-zinc-400" />
            <span>Direct Client-to-B2 Transfers</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Media bytes travel directly between your browser and Backblaze using presigned S3 PUT and multipart endpoints. No server memory bottlenecks or proxy latency.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            <span>Permanent Share Links</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Share links never rot. Opening a link generates a fresh, authenticated stream and download token dynamically on each visit.
          </p>
        </div>
      </div>
    </section>
  );
};
