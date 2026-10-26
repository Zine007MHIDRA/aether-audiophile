"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  X,
  Play,
  Pause,
  Disc,
  Clock,
  Trash2,
  Sparkles,
  Flame,
  Layers,
  Music2,
} from "lucide-react";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

const MOODS = [
  {
    name: "Nocturne Ambient",
    sub: "Atmospheric & Calm",
    gradient: "from-[#14151C] to-[#1E1F2A]",
    query: "Ambient Nocturne Calm Atmospheric",
  },
  {
    name: "Obsidian Electronic",
    sub: "Deep Synth & Bass",
    gradient: "from-[#12141C] to-[#252838]",
    query: "Electronic Synthwave Deep Bass Melodic",
  },
  {
    name: "Neoclassical & Piano",
    sub: "Strings & Keys",
    gradient: "from-[#16151B] to-[#2B2735]",
    query: "Neoclassical Piano Strings Contemporary",
  },
  {
    name: "Deep House & Groove",
    sub: "Late Night Melodic",
    gradient: "from-[#15171B] to-[#222731]",
    query: "Deep House Melodic Late Night",
  },
  {
    name: "Lo-Fi Resonance",
    sub: "Tapes & Vinyl Heat",
    gradient: "from-[#181615] to-[#2D2824]",
    query: "Lo-Fi Hip Hop Chill Beats Vinyl",
  },
  {
    name: "Cinematic Horizons",
    sub: "Film Scores & Epics",
    gradient: "from-[#12161A] to-[#202933]",
    query: "Cinematic Film Score Hans Zimmer Orchestral",
  },
  {
    name: "Soul & Warm Jazz",
    sub: "Analog Brass & Rhodes",
    gradient: "from-[#1A1615] to-[#332A24]",
    query: "Soul Jazz Rhodes Analog Brass Warm",
  },
  {
    name: "Audiophile Masters",
    sub: "Ultra High-Fidelity Reference",
    gradient: "from-[#1C1814] to-[#382E22]",
    query: "Audiophile Reference Hi-Res Acoustic Master",
  },
];

const QUICK_FILTERS = [
  "Audiophile Reference",
  "Hans Zimmer",
  "Miles Davis",
  "Daft Punk",
  "Ludovico Einaudi",
  "Cigarettes After Sex",
  "Max Richter",
  "Nils Frahm",
  "FKJ",
  "Bonobo",
];

const RECENT_SEARCHES_KEY = "aether-recent-searches";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "tracks" | "spotlight">("all");

  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  // Save to recent searches
  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      return updated;
    });
  }, []);

  // Remove single recent search
  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((term) => term !== termToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage error
    }
  };

  // Search execution with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);

      // Sync URL without full page reload
      const newUrl = `/search?q=${encodeURIComponent(query.trim())}`;
      window.history.replaceState(null, "", newUrl);

      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.tracks) {
            setResults(data.tracks);
            if (data.tracks.length > 0) {
              saveRecentSearch(query.trim());
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Search error:", err);
          setLoading(false);
        });
    }, 320);

    return () => clearTimeout(timer);
  }, [query, saveRecentSearch]);

  const topResult = results[0];
  const isTopPlaying = currentTrack?.id === topResult?.id && isPlaying;

  const handleSelectQuery = (selectedQuery: string) => {
    setQuery(selectedQuery);
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 pb-36 select-none">
      {/* Search Input Bar & Quick Filters */}
      <div className="flex flex-col gap-3 max-w-2xl">
        <div className="relative w-full">
          <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-aether-gold" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artist, composition, acoustic master... (Press / to focus)"
            autoFocus
            className="w-full bg-aether-surface/80 border border-aether-border/60 text-white placeholder-aether-muted text-xs tracking-wider rounded-2xl pl-12 pr-10 py-3.5 focus:outline-none focus:border-aether-gold/80 focus:ring-1 focus:ring-aether-gold/50 transition-all shadow-inner"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                window.history.replaceState(null, "", "/search");
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-aether-muted hover:text-white transition"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#D4AF37]" />
            Trending:
          </span>
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => handleSelectQuery(filter)}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 text-zinc-300 hover:text-[#F3E5AB] transition whitespace-nowrap shrink-0 text-[11px]"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-aether-gold text-xs font-mono tracking-widest uppercase animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
          <span>Scanning global frequency catalog...</span>
        </div>
      )}

      {/* Recent Searches Tray (Visible when query is empty) */}
      {!query && recentSearches.length > 0 && (
        <div className="flex flex-col gap-2.5 max-w-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#D4AF37]" />
              Recent Searches
            </span>
            <button
              onClick={clearAllRecentSearches}
              className="text-[10px] text-zinc-500 hover:text-rose-400 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {recentSearches.map((term) => (
              <div
                key={term}
                onClick={() => handleSelectQuery(term)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 text-zinc-300 hover:text-white text-xs cursor-pointer transition shadow-sm"
              >
                <Clock className="w-3 h-3 text-zinc-500 group-hover:text-[#D4AF37] transition" />
                <span>{term}</span>
                <button
                  onClick={(e) => removeRecentSearch(e, term)}
                  className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-white/10 ml-0.5 transition"
                  title="Remove from history"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Category Tabs (Visible when results exist) */}
      {!loading && results.length > 0 && (
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === "all"
                ? "bg-[#D4AF37] text-black font-semibold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            All Results ({results.length})
          </button>

          {topResult && (
            <button
              onClick={() => setActiveTab("spotlight")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                activeTab === "spotlight"
                  ? "bg-[#D4AF37] text-black font-semibold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Prime Spotlight
            </button>
          )}

          <button
            onClick={() => setActiveTab("tracks")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === "tracks"
                ? "bg-[#D4AF37] text-black font-semibold shadow-md"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Compositions ({results.length})
          </button>
        </div>
      )}

      {/* Active Results Display */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-200">
          {(activeTab === "all" || activeTab === "spotlight") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Spotlight Result */}
              {topResult && (
                <div className="lg:col-span-1 flex flex-col gap-3">
                  <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
                    Prime Result
                  </span>
                  <div
                    onClick={() => playTrack(topResult, results)}
                    className="group bg-aether-surface/50 hover:bg-aether-surface border border-aether-border/40 hover:border-aether-gold/30 p-6 rounded-2xl flex flex-col justify-between cursor-pointer transition relative shadow-xl overflow-hidden"
                  >
                    {/* Ambient Gold Radial Glow Behind Artwork */}
                    <div className="absolute top-4 left-4 w-36 h-36 bg-[#D4AF37]/20 rounded-full blur-2xl pointer-events-none group-hover:bg-[#D4AF37]/30 transition-all duration-500" />

                    {/* Artwork Container */}
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-aether-highlight shadow-xl mb-5 border border-white/10 group-hover:border-[#D4AF37]/40 transition-all duration-300 shrink-0 z-10">
                      <img
                        src={getHighResThumbnail(
                          topResult.thumbnail,
                          topResult.id
                        )}
                        alt={topResult.title}
                        onError={(e) => handleImageError(e, topResult.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="z-10 pr-12">
                      <h3 className="text-xl font-bold text-white tracking-tight truncate">
                        {topResult.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono font-semibold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded tracking-wider uppercase">
                          Master
                        </span>
                        <span className="text-[9px] font-mono font-semibold text-[#F3E5AB] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2 py-0.5 rounded tracking-wider uppercase">
                          24-Bit / 96kHz Hi-Res
                        </span>
                        <span className="text-zinc-400 text-xs truncate">
                          {topResult.artist}
                        </span>
                      </div>
                    </div>

                    {/* Floating Circular Gold Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentTrack?.id === topResult.id) {
                          togglePlay();
                        } else {
                          playTrack(topResult, results);
                        }
                      }}
                      className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-tr from-[#C5A059] via-[#D4AF37] to-[#F3E5AB] text-black flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.45)] hover:scale-110 active:scale-95 transition-all duration-200 z-10"
                      title={isTopPlaying ? "Pause" : "Play"}
                    >
                      {isTopPlaying ? (
                        <Pause className="w-5 h-5 fill-black text-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Compositions Songs List */}
              {activeTab === "all" && (
                <div className="lg:col-span-2 flex flex-col gap-3">
                  <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
                    Compositions
                  </span>
                  <div className="flex flex-col">
                    {results.slice(0, 5).map((track, idx) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={idx}
                        tracksContext={results}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extended Discography List */}
          {(activeTab === "all" || activeTab === "tracks") && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
                {activeTab === "tracks"
                  ? `All Compositions (${results.length})`
                  : "Extended Discography"}
              </span>
              <div className="flex flex-col">
                {(activeTab === "tracks" ? results : results.slice(5)).map(
                  (track, idx) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={activeTab === "tracks" ? idx : idx + 5}
                      tracksContext={results}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zero Results State */}
      {!loading && query && results.length === 0 && (
        <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3 max-w-md mx-auto my-8">
          <Music2 className="w-8 h-8 text-zinc-600 mb-1" />
          <h3 className="text-sm font-semibold text-white">
            No acoustic matches found
          </h3>
          <p className="text-xs text-zinc-400">
            We couldn&apos;t find matching compositions for &ldquo;{query}&rdquo;.
            Try searching by artist name, album, or explore curated soundscapes
            below.
          </p>
          <button
            onClick={() => setQuery("")}
            className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Curated Soundscape Discovery Trays */}
      {!loading && !query && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2 border-b border-aether-border/30 pb-3">
            <Disc className="w-4 h-4 text-aether-gold" />
            <h2 className="text-xs font-bold text-white tracking-wider uppercase">
              Curated Soundscapes
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {MOODS.map((mood) => (
              <div
                key={mood.name}
                onClick={() => handleSelectQuery(mood.query || mood.name)}
                className={`p-5 rounded-2xl bg-gradient-to-br ${mood.gradient} border border-aether-border/40 hover:border-aether-gold/40 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md group select-none`}
              >
                <span className="text-xs font-bold text-white tracking-wide group-hover:text-aether-gold transition">
                  {mood.name}
                </span>
                <span className="text-[10px] text-aether-subdued font-mono mt-4">
                  {mood.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-6 md:p-8 flex flex-col gap-4">
          <div className="h-10 w-96 rounded-2xl bg-zinc-900/60 animate-pulse" />
          <div className="h-32 rounded-2xl bg-zinc-900/40 animate-pulse mt-4" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
