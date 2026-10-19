"use client";

import React from "react";
import Link from "next/link";
import { Bookmark, Sparkles, Clock, Compass, Play } from "lucide-react";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";

export default function VaultPage() {
  const { likedTracks, playTrack } = usePlayerStore();

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-aether-surface via-aether-elevated to-aether-dark p-6 md:p-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-aether-border/30">
        <div className="flex items-center sm:items-end gap-5">
          <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-aether-surface via-aether-elevated to-aether-highlight border border-aether-gold/40 flex items-center justify-center text-aether-gold shadow-gold-glow shrink-0">
            <Bookmark className="w-10 h-10 sm:w-16 sm:h-16 fill-aether-gold/20 text-aether-gold" />
          </div>
          <div className="flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Collection</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              The Vault
            </h1>
            <div className="flex items-center gap-2 text-xs text-aether-subdued mt-0.5 sm:mt-1 font-mono">
              <span>Saved Acoustics</span>
              <span>•</span>
              <span className="text-aether-gold font-semibold">
                {likedTracks.length} {likedTracks.length === 1 ? "Track" : "Tracks"}
              </span>
            </div>
          </div>
        </div>

        {likedTracks.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2.5 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-full shadow-gold-glow hover:scale-105 active:scale-95 transition-all duration-200 self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-black text-black" />
            <span>Play Vault</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 flex-1 flex flex-col gap-6">
        {likedTracks.length === 0 ? (
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
            <div className="border-b border-aether-border/30 pb-2 px-3 flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest mb-2">
              <div className="flex items-center gap-4">
                <span className="w-5 text-center">#</span>
                <span>Composition</span>
              </div>
              <div className="flex items-center gap-6">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex flex-col">
              {likedTracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  tracksContext={likedTracks}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
