"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Play, Clock } from "lucide-react";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";

export default function LikedSongsPage() {
  const { likedTrackIds, playTrack } = usePlayerStore();
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  // When likedTrackIds changes, if we have stored tracks or we can resolve them
  // For demo/cache, we can store track metadata in player store or fetch
  useEffect(() => {
    // In a full DB setup, this fetches from the user DB
    // Here we can fetch the tracks or read from session cache
  }, [likedTrackIds]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-indigo-900 to-spotify-dark p-8 flex items-end gap-6 shadow-lg">
        <div className="w-48 h-48 rounded bg-gradient-to-br from-indigo-600 to-purple-400 flex items-center justify-center text-white shadow-2xl shrink-0">
          <Heart className="w-20 h-20 fill-white" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider font-bold text-white/80">
            Playlist
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            Liked Songs
          </h1>
          <div className="flex items-center gap-2 text-sm text-white/80 mt-2">
            <span className="font-semibold text-white">Your Library</span>
            <span>•</span>
            <span>
              {likedTrackIds.length}{" "}
              {likedTrackIds.length === 1 ? "song" : "songs"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 flex-1 flex flex-col gap-6">
        {likedTrackIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Heart className="w-16 h-16 text-spotify-subdued stroke-[1.5]" />
            <h2 className="text-2xl font-bold text-white">
              Songs you like will appear here
            </h2>
            <p className="text-spotify-subdued text-sm max-w-sm">
              Save songs by clicking the heart icon on any track in Search or Home.
            </p>
            <Link
              href="/search"
              className="bg-white text-black font-bold px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition mt-2"
            >
              Find songs to add
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-white/10 pb-2 px-2 flex items-center justify-between text-xs text-spotify-subdued uppercase tracking-wider">
              <div className="flex items-center gap-4">
                <span className="w-6 text-center">#</span>
                <span>Title</span>
              </div>
              <div className="flex items-center gap-6">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="text-spotify-subdued text-sm py-6 text-center">
              You have {likedTrackIds.length} saved songs in your personal collection.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
