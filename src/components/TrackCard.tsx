"use client";

import React from "react";
import { Play, Pause, MoreHorizontal } from "lucide-react";
import { Track } from "@/types/music";
import { usePlayerStore } from "@/store/player-store";
import { useContextMenuStore } from "@/store/context-menu-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

interface TrackCardProps {
  track: Track;
  tracksContext?: Track[];
}

export function TrackCard({ track, tracksContext }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { openContextMenu } = useContextMenuStore();

  const isCurrent = currentTrack?.id === track.id;
  const thumbnailSrc = getHighResThumbnail(track.thumbnail, track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, tracksContext);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(track, { x: e.clientX, y: e.clientY }, tracksContext);
  };

  return (
    <div
      onClick={handlePlayClick}
      onContextMenu={handleContextMenu}
      className="group bg-aether-elevated/40 hover:bg-aether-elevated border border-aether-border/30 hover:border-aether-gold/40 transition-all duration-300 p-3.5 rounded-2xl flex flex-col gap-3 cursor-pointer relative shadow-sm hover:shadow-gold-glow"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-aether-highlight shadow-md">
        <img
          src={thumbnailSrc}
          alt={track.title}
          onError={(e) => handleImageError(e, track.id)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Floating 3-dots Context Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openContextMenu(track, { x: e.clientX, y: e.clientY }, tracksContext);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/90 flex items-center justify-center transition-all duration-200 opacity-70 md:opacity-0 md:group-hover:opacity-100 shadow-md"
          title="Track options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Minimalist Champagne Gold Play Button */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-gradient-to-tr from-aether-gold-muted via-aether-gold to-aether-gold-hover text-black flex items-center justify-center shadow-lg transition-all duration-300 ${
            isCurrent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 fill-black" />
          ) : (
            <Play className="w-4 h-4 fill-black ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex flex-col min-w-0 px-0.5">
        <span
          className={`font-semibold text-xs tracking-wide truncate ${
            isCurrent ? "text-aether-gold font-bold" : "text-white"
          }`}
        >
          {track.title}
        </span>
        <span className="text-aether-subdued text-[11px] truncate mt-1">
          {track.artist}
        </span>
      </div>
    </div>
  );
}
