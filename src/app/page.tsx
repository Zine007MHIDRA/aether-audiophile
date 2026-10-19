"use client";

import React, { useEffect, useState } from "react";
import { Track } from "@/types/music";
import { TrackCard } from "@/components/TrackCard";
import { TrackRow } from "@/components/TrackRow";
import { Play, Sparkles, Disc, Radio } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

export default function HomePage() {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) {
          setTrendingTracks(data.tracks);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Aether catalog error:", err);
        setLoading(false);
      });
  }, []);

  const heroTrack = trendingTracks[0];

  return (
    <div className="flex-1 p-8 flex flex-col gap-10">
      {/* Editorial Spotlight Banner */}
      {heroTrack ? (
        <div className="relative rounded-3xl overflow-hidden border border-aether-border/50 bg-gradient-to-r from-aether-surface via-aether-elevated to-aether-dark p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-aether-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-4 max-w-xl z-10">
            <div className="flex items-center gap-2 text-aether-gold text-xs font-mono tracking-widest uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Aether Curated Selection</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {heroTrack.title}
            </h1>
            <p className="text-aether-subdued text-sm md:text-base font-light">
              by <span className="text-white font-medium">{heroTrack.artist}</span> • {heroTrack.album || "Studio Master"}
            </p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => playTrack(heroTrack, trendingTracks)}
                className="flex items-center gap-2.5 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-full shadow-gold-glow hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Begin Listening</span>
              </button>
            </div>
          </div>

          {/* Hero Visual Disk */}
          <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-aether-gold/30 shadow-2xl shrink-0 group">
            <img
              src={heroTrack.thumbnail}
              alt={heroTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-aether-gold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-aether-gold/30">
              LOSSLESS
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid: Global Discoveries */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-aether-border/30 pb-3">
          <div className="flex items-center gap-2.5">
            <Disc className="w-4 h-4 text-aether-gold" />
            <h2 className="text-lg font-bold text-white tracking-wider uppercase text-xs">
              Selected Works & Anthems
            </h2>
          </div>
          <span className="text-[10px] text-aether-muted font-mono uppercase tracking-widest">
            On-Demand Stream
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-aether-surface/40 border border-aether-border/30 rounded-2xl p-4 flex flex-col gap-3 animate-pulse"
              >
                <div className="aspect-square bg-aether-highlight rounded-xl" />
                <div className="h-3.5 bg-aether-highlight rounded w-3/4" />
                <div className="h-2.5 bg-aether-highlight rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trendingTracks.slice(1, 11).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                tracksContext={trendingTracks}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detailed Acoustics List */}
      {trendingTracks.length > 11 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-aether-border/30 pb-3">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-aether-gold" />
              <h2 className="text-xs font-bold text-white tracking-wider uppercase">
                Acoustic Frequency Index
              </h2>
            </div>
            <span className="text-[10px] text-aether-muted font-mono uppercase">
              {trendingTracks.length - 11} Tracks
            </span>
          </div>

          <div className="flex flex-col">
            {trendingTracks.slice(11).map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx + 10}
                tracksContext={trendingTracks}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
