"use client";

import React from "react";
import { Play, Pause } from "lucide-react";
import { Track } from "@/types/music";
import { usePlayerStore } from "@/store/player-store";

interface TrackCardProps {
  track: Track;
  tracksContext?: Track[];
}

export function TrackCard({ track, tracksContext }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, tracksContext);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group bg-spotify-elevated hover:bg-spotify-highlight/80 transition-all duration-300 p-4 rounded-lg flex flex-col gap-3 cursor-pointer relative shadow-md hover:shadow-xl"
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-spotify-highlight shadow-lg">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Hover / Playing green play button */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shadow-xl transition-all duration-300 ${
            isCurrent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex flex-col min-w-0">
        <span
          className={`font-semibold text-sm truncate ${
            isCurrent ? "text-spotify-green" : "text-white"
          }`}
        >
          {track.title}
        </span>
        <span className="text-spotify-subdued text-xs truncate mt-0.5">
          {track.artist}
        </span>
      </div>
    </div>
  );
}
