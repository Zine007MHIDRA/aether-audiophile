"use client";

import React from "react";
import { Play, Pause, Bookmark } from "lucide-react";
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
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-aether-elevated/70 border border-transparent hover:border-aether-border/50 transition cursor-pointer select-none text-xs ${
        isCurrent ? "bg-aether-gold-glow/50 border-aether-gold/20" : ""
      }`}
    >
      {/* Left: Index / Play Icon & Track Details */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
        {/* Index or Live Equalizer */}
        <div className="w-5 text-center text-aether-muted text-[11px] font-mono shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-aether-gold animate-pulse h-full" />
              <span className="w-0.5 bg-aether-gold animate-pulse h-2" />
              <span className="w-0.5 bg-aether-gold animate-pulse h-3.5" />
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="w-3.5 h-3.5 fill-aether-gold text-aether-gold hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Artwork Thumbnail */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-aether-highlight shrink-0 shadow border border-aether-border/40">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col min-w-0">
          <span
            className={`font-medium tracking-wide truncate ${
              isCurrent ? "text-aether-gold font-semibold" : "text-white"
            }`}
          >
            {track.title}
          </span>
          <span className="text-aether-subdued text-[11px] truncate group-hover:text-aether-text transition mt-0.5">
            {track.artist}
          </span>
        </div>
      </div>

      {/* Center: Album */}
      <div className="hidden md:block w-1/4 truncate text-aether-muted text-[11px] pr-4">
        {track.album || "Single"}
      </div>

      {/* Right: Save to Vault & Duration */}
      <div className="flex items-center gap-3.5 shrink-0 text-aether-subdued text-[11px] font-mono tabular-nums">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          className={`p-1 rounded transition ${
            isLiked
              ? "text-aether-gold opacity-100"
              : "opacity-0 group-hover:opacity-100 hover:text-white"
          }`}
          title={isLiked ? "Saved in Vault" : "Save to Vault"}
        >
          <Bookmark
            className={`w-3.5 h-3.5 ${isLiked ? "fill-aether-gold" : ""}`}
          />
        </button>
        <span className="w-10 text-right">{track.durationFormatted}</span>
      </div>
    </div>
  );
}
