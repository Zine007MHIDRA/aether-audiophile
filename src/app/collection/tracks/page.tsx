"use client";

import React from "react";
import Link from "next/link";
import { Bookmark, Sparkles, Clock, Compass } from "lucide-react";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";

export default function VaultPage() {
  const { likedTrackIds } = usePlayerStore();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-aether-surface via-aether-elevated to-aether-dark p-8 md:p-12 flex items-end gap-6 border-b border-aether-border/30">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-aether-surface via-aether-elevated to-aether-highlight border border-aether-gold/40 flex items-center justify-center text-aether-gold shadow-gold-glow shrink-0">
          <Bookmark className="w-16 h-16 fill-aether-gold/20 text-aether-gold" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Collection</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            The Vault
          </h1>
          <div className="flex items-center gap-2 text-xs text-aether-subdued mt-1 font-mono">
            <span>Saved Acoustics</span>
            <span>•</span>
            <span className="text-aether-gold">
              {likedTrackIds.length} {likedTrackIds.length === 1 ? "Track" : "Tracks"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 flex-1 flex flex-col gap-6">
        {likedTrackIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Bookmark className="w-12 h-12 text-aether-muted stroke-[1.5]" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Your Vault is Empty
            </h2>
            <p className="text-aether-subdued text-xs max-w-sm leading-relaxed">
              Bookmark tracks to preserve them in your private high-fidelity sanctuary.
            </p>
            <Link
              href="/search"
              className="flex items-center gap-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-gold-glow mt-3"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-aether-border/30 pb-2 px-3 flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span className="w-5 text-center">#</span>
                <span>Composition</span>
              </div>
              <div className="flex items-center gap-6">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="text-aether-subdued text-xs py-8 text-center font-mono">
              {likedTrackIds.length} compositions cataloged in memory.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
