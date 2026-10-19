"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, X, Play, Pause, Disc } from "lucide-react";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";

const MOODS = [
  { name: "Nocturne Ambient", sub: "Atmospheric & Calm", gradient: "from-[#14151C] to-[#1E1F2A]" },
  { name: "Obsidian Electronic", sub: "Deep Synth & Bass", gradient: "from-[#12141C] to-[#252838]" },
  { name: "Neoclassical & Piano", sub: "Strings & Keys", gradient: "from-[#16151B] to-[#2B2735]" },
  { name: "Deep House & Groove", sub: "Late Night Melodic", gradient: "from-[#15171B] to-[#222731]" },
  { name: "Lo-Fi Resonance", sub: "Tapes & Vinyl Heat", gradient: "from-[#181615] to-[#2D2824]" },
  { name: "Cinematic Horizons", sub: "Film Scores & Epics", gradient: "from-[#12161A] to-[#202933]" },
  { name: "Soul & Warm Jazz", sub: "Analog Brass & Rhodes", gradient: "from-[#1A1615] to-[#332A24]" },
  { name: "Contemporary Wave", sub: "Modern Anthems", gradient: "from-[#16131C] to-[#2C2138]" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.tracks) {
            setResults(data.tracks);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Search error:", err);
          setLoading(false);
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const topResult = results[0];
  const isTopPlaying = currentTrack?.id === topResult?.id && isPlaying;

  return (
    <div className="flex-1 p-8 flex flex-col gap-8">
      {/* Search Input Bar */}
      <div className="relative max-w-lg">
        <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-aether-gold" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist, composition, or frequency..."
          autoFocus
          className="w-full bg-aether-surface/80 border border-aether-border/60 text-white placeholder-aether-muted text-xs tracking-wider rounded-2xl pl-12 pr-10 py-3.5 focus:outline-none focus:border-aether-gold/80 focus:ring-1 focus:ring-aether-gold/50 transition-all shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-aether-muted hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-aether-gold text-xs font-mono tracking-widest uppercase animate-pulse">
          Querying global frequency matrix...
        </div>
      )}

      {/* Search Results */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Spotlight Result */}
            {topResult && (
              <div className="lg:col-span-1 flex flex-col gap-3">
                <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
                  Prime Result
                </span>
                <div
                  onClick={() => playTrack(topResult, results)}
                  className="group bg-aether-surface/50 hover:bg-aether-surface border border-aether-border/40 hover:border-aether-gold/30 p-6 rounded-2xl flex flex-col justify-between cursor-pointer transition relative shadow-lg"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-aether-highlight shadow-md mb-5 border border-aether-border/60">
                    <img
                      src={topResult.thumbnail}
                      alt={topResult.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight truncate">
                      {topResult.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-mono text-aether-gold bg-aether-gold/10 border border-aether-gold/20 px-2 py-0.5 rounded uppercase">
                        Master
                      </span>
                      <span className="text-aether-subdued text-xs truncate">
                        {topResult.artist}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === topResult.id) {
                        togglePlay();
                      } else {
                        playTrack(topResult, results);
                      }
                    }}
                    className="absolute bottom-6 right-6 w-11 h-11 rounded-full bg-gradient-to-tr from-aether-gold-muted via-aether-gold to-aether-gold-hover text-black flex items-center justify-center shadow-gold-glow opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                  >
                    {isTopPlaying ? (
                      <Pause className="w-4 h-4 fill-black text-black" />
                    ) : (
                      <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Songs List */}
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
          </div>

          {/* More Tracks */}
          {results.length > 5 && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
                Extended Discography
              </span>
              <div className="flex flex-col">
                {results.slice(5).map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx + 5}
                    tracksContext={results}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mood Discovery Trays */}
      {!loading && !query && (
        <div className="flex flex-col gap-4">
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
                onClick={() => setQuery(mood.name)}
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
