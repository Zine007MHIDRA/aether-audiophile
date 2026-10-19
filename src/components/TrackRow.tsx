"use client";

import React from "react";
import { Play, Pause, Heart } from "lucide-react";
import { Track } from "@/types/music";
import { usePlayerStore } from "@/store/player-store";

interface TrackRowProps {
  track: Track;
  index: number;
  tracksContext?: Track[];
}

export function TrackRow({ track, index, tracksContext }: TrackRowProps) {
  const {
    currentTrack,
    isPlaying,
    likedTrackIds,
    playTrack,
    togglePlay,
    toggleLike,
  } = usePlayerStore();

  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTrackIds.includes(track.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, tracksContext);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition cursor-pointer select-none text-sm ${
        isCurrent ? "bg-white/5" : ""
      }`}
    >
      {/* Left: Index / Play Button & Title */}
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {/* Number or Play icon */}
        <div className="w-6 text-center text-spotify-subdued text-xs shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-1 bg-spotify-green animate-pulse h-full" />
              <span className="w-1 bg-spotify-green animate-pulse h-2" />
              <span className="w-1 bg-spotify-green animate-pulse h-3.5" />
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="w-4 h-4 fill-white text-white hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded overflow-hidden bg-spotify-highlight shrink-0 shadow">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <span
            className={`font-medium truncate ${
              isCurrent ? "text-spotify-green" : "text-white"
            }`}
          >
            {track.title}
          </span>
          <span className="text-spotify-subdued text-xs truncate group-hover:text-white transition">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Center: Album (hidden on small screens) */}
      <div className="hidden md:block w-1/4 truncate text-spotify-subdued text-xs pr-4">
        {track.album || "Single"}
      </div>

      {/* Right: Like button & Duration */}
      <div className="flex items-center gap-4 shrink-0 text-spotify-subdued text-xs tabular-nums">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track.id);
          }}
          className={`p-1 transition ${
            isLiked
              ? "text-spotify-green fill-spotify-green"
              : "opacity-0 group-hover:opacity-100 hover:text-white"
          }`}
          title={isLiked ? "Unlike" : "Like"}
        >
          <Heart
            className={`w-4 h-4 ${
              isLiked ? "fill-spotify-green text-spotify-green" : ""
            }`}
          />
        </button>
        <span className="w-10 text-right">{track.durationFormatted}</span>
      </div>
    </div>
  );
}
