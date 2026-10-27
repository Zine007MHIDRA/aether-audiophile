"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Track } from "@/types/music";
import { TrackCard } from "@/components/TrackCard";
import { TrackRow } from "@/components/TrackRow";
import { Play, Sparkles, Disc, Radio, Flame, Zap, Moon, RefreshCw } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "Global Top 50", icon: Sparkles },
  { id: "pop", label: "Pop Anthems", icon: Disc },
  { id: "hiphop", label: "Hip-Hop & R&B", icon: Flame },
  { id: "electronic", label: "Electronic & Dance", icon: Zap },
  { id: "rock", label: "Rock & Alternative", icon: Radio },
  { id: "chill", label: "Acoustic & Chill", icon: Moon },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const playTrack = usePlayerStore((state) => state.playTrack);

  const fetchCategoryTracks = useCallback(async (cat: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/home?category=${encodeURIComponent(cat)}`);
      const data = await res.json();
      if (data.tracks && Array.isArray(data.tracks)) {
        setTrendingTracks(data.tracks);
      }
    } catch (err) {
      console.error("Aether catalog error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoryTracks(selectedCategory);
  }, [selectedCategory, fetchCategoryTracks]);

  const heroTrack = trendingTracks[0];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Category & Vibe Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 shrink-0 border ${
                isActive
                  ? "bg-gradient-to-r from-aether-gold via-aether-gold-hover to-[#996515] text-black border-aether-gold font-bold shadow-gold-glow scale-[1.02]"
                  : "bg-aether-surface/60 border-aether-border/60 text-aether-subdued hover:text-white hover:border-aether-gold/40 hover:bg-aether-elevated/40"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-black fill-black/20" : "text-aether-gold"}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Editorial Spotlight Banner */}
      {heroTrack && !loading ? (
        <div className="relative rounded-3xl overflow-hidden border border-aether-border/50 bg-gradient-to-r from-aether-surface via-aether-elevated to-aether-dark p-6 md:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-aether-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-3.5 max-w-xl z-10 text-center md:text-left items-center md:items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aether-gold/15 border border-aether-gold/30 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Billboard & Global Chart Highlight</span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
              {heroTrack.title}
            </h1>
            <p className="text-aether-subdued text-xs md:text-sm font-light">
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
          <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden border border-aether-gold/30 shadow-2xl shrink-0 group">
            <img
              src={getHighResThumbnail(heroTrack.thumbnail, heroTrack.id)}
              alt={heroTrack.title}
              onError={(e) => handleImageError(e, heroTrack.id)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-aether-gold bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-aether-gold/30">
              LOSSLESS 24-BIT
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid: Global Discoveries */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-aether-border/30 pb-3">
          <div className="flex items-center gap-2.5">
            <Disc className="w-4 h-4 text-aether-gold" />
            <h2 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Selected Works & Anthems"}
            </h2>
          </div>
          <span className="text-[10px] text-aether-muted font-mono uppercase tracking-widest">
            {loading ? "Tuning Sanctuary..." : `${trendingTracks.length} Verified Master Tracks`}
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
      {!loading && trendingTracks.length > 11 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-aether-border/30 pb-3">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-aether-gold" />
              <h2 className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                Extended Sanctuary Stream
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
