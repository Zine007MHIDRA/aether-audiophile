"use client";

import React from "react";
import { Play, Bookmark } from "lucide-react";
import { Track } from "@/types/music";
import { usePlayerStore } from "@/store/player-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

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
  const thumbnailSrc = getHighResThumbnail(track.thumbnail, track.id);

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
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer select-none text-xs ${
        isCurrent
          ? "bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent border border-[#D4AF37]/30 shadow-[inset_3px_0_0_#D4AF37]"
          : "border border-transparent hover:bg-aether-elevated/70 hover:border-aether-border/50"
      }`}
    >
      {/* Left: Index / Equalizer & Track Details */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
        {/* Index or Live Equalizer */}
        <div className="w-5 text-center text-aether-muted text-[11px] font-mono shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 bg-[#D4AF37] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
              <span className="w-0.5 bg-[#F3E5AB] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s] h-2.5" />
              <span className="w-0.5 bg-[#D4AF37] rounded-full animate-[pulse_0.75s_ease-in-out_infinite_0.3s] h-3.5" />
            </div>
          ) : isCurrent ? (
            <Play className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <Play className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Artwork Thumbnail */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-aether-highlight shrink-0 shadow border border-aether-border/40">
          <img
            src={thumbnailSrc}
            alt={track.title}
            onError={(e) => handleImageError(e, track.id)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col min-w-0">
          <span
            className={`font-medium tracking-wide truncate ${
              isCurrent ? "text-[#F3E5AB] font-semibold" : "text-white"
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
      <div
        className={`hidden md:block w-1/4 truncate text-[11px] pr-4 transition-colors ${
          isCurrent ? "text-zinc-300 font-medium" : "text-aether-muted group-hover:text-zinc-300"
        }`}
      >
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
