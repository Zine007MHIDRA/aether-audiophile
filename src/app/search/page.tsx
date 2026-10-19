"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, X, Music, Play, Pause } from "lucide-react";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";

const GENRES = [
  { name: "Hip-Hop", color: "from-orange-600 to-amber-700" },
  { name: "Pop", color: "from-blue-600 to-indigo-700" },
  { name: "Rock", color: "from-red-600 to-rose-800" },
  { name: "R&B", color: "from-purple-600 to-fuchsia-800" },
  { name: "Electronic", color: "from-teal-600 to-emerald-800" },
  { name: "Lo-Fi Beats", color: "from-yellow-600 to-orange-800" },
  { name: "Classical", color: "from-stone-600 to-slate-800" },
  { name: "Anime / OST", color: "from-pink-600 to-rose-700" },
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
    <div className="flex-1 p-6 flex flex-col gap-6">
      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-spotify-subdued" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to play?"
          autoFocus
          className="w-full bg-spotify-highlight text-white placeholder-spotify-subdued text-sm rounded-full pl-11 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-white transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-spotify-subdued hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-spotify-subdued text-sm animate-pulse">
          Searching artists, tracks, and albums...
        </div>
      )}

      {/* Results View */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Result Card */}
            {topResult && (
              <div className="lg:col-span-1 flex flex-col gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Top result
                </h2>
                <div
                  onClick={() => playTrack(topResult, results)}
                  className="group bg-spotify-elevated hover:bg-spotify-highlight/80 p-5 rounded-lg flex flex-col justify-between cursor-pointer transition relative shadow-lg"
                >
                  <div className="w-24 h-24 rounded overflow-hidden bg-spotify-highlight shadow-md mb-4">
                    <img
                      src={topResult.thumbnail}
                      alt={topResult.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white truncate">
                      {topResult.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-black/40 text-spotify-subdued px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        Song
                      </span>
                      <span className="text-spotify-subdued text-sm truncate">
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
                    className="absolute bottom-5 right-5 w-12 h-12 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                  >
                    {isTopPlaying ? (
                      <Pause className="w-6 h-6 fill-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Songs List */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Songs
              </h2>
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

          {/* More Results */}
          {results.length > 5 && (
            <div className="flex flex-col gap-3 mt-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                More Results
              </h2>
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

      {/* Empty Search: Browse Categories */}
      {!loading && !query && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Browse all
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {GENRES.map((genre) => (
              <div
                key={genre.name}
                onClick={() => setQuery(genre.name)}
                className={`h-32 p-4 rounded-lg bg-gradient-to-br ${genre.color} flex justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition shadow-md select-none overflow-hidden relative`}
              >
                <span className="font-bold text-lg text-white">
                  {genre.name}
                </span>
                <Music className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2 rotate-12" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
