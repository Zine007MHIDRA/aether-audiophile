"use client";

import React, { useEffect, useState } from "react";
import { Track } from "@/types/music";
import { TrackCard } from "@/components/TrackCard";
import { TrackRow } from "@/components/TrackRow";
import { Play, Sparkles, TrendingUp } from "lucide-react";
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
        console.error("Failed to load home tracks:", err);
        setLoading(false);
      });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 p-6 flex flex-col gap-8">
      {/* Top Hero Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          {getGreeting()}
        </h1>
        {trendingTracks.length > 0 && (
          <button
            onClick={() => playTrack(trendingTracks[0], trendingTracks)}
            className="flex items-center gap-2 bg-spotify-green hover:bg-spotify-green-hover text-black font-bold px-4 py-2.5 rounded-full shadow-lg transition active:scale-95"
          >
            <Play className="w-5 h-5 fill-black" />
            <span>Play Trending</span>
          </button>
        )}
      </div>

      {/* Quick Picks Bento */}
      {trendingTracks.length >= 6 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trendingTracks.slice(0, 6).map((track) => (
            <div
              key={track.id}
              onClick={() => playTrack(track, trendingTracks)}
              className="group flex items-center bg-white/5 hover:bg-white/10 rounded-md overflow-hidden cursor-pointer transition select-none shadow"
            >
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-16 h-16 object-cover shrink-0"
              />
              <span className="font-semibold text-sm px-4 truncate flex-1 text-white">
                {track.title}
              </span>
              <div className="w-10 h-10 rounded-full bg-spotify-green text-black flex items-center justify-center mr-4 opacity-0 group-hover:opacity-100 transition shadow-lg shrink-0">
                <Play className="w-5 h-5 fill-black ml-0.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trending Today Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-spotify-green" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Today&apos;s Top Hits
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-spotify-elevated rounded-lg p-4 flex flex-col gap-3 animate-pulse"
              >
                <div className="aspect-square bg-spotify-highlight rounded-md" />
                <div className="h-4 bg-spotify-highlight rounded w-3/4" />
                <div className="h-3 bg-spotify-highlight rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trendingTracks.slice(0, 10).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                tracksContext={trendingTracks}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent List View */}
      {trendingTracks.length > 10 && (
        <section className="flex flex-col gap-3 pb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-spotify-green" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              More Recommended For You
            </h2>
          </div>

          <div className="flex flex-col">
            {trendingTracks.slice(10, 20).map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                tracksContext={trendingTracks}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
