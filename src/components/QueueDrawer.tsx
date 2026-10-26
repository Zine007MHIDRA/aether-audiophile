"use client";

import React, { useEffect } from "react";
import {
  X,
  Play,
  Trash2,
  ListMusic,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Bookmark,
  Volume2,
} from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { useContextMenuStore } from "@/store/context-menu-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function QueueDrawer() {
  const {
    queue,
    queueIndex,
    currentTrack,
    isPlaying,
    isQueueOpen,
    toggleQueue,
    setIsQueueOpen,
    jumpToQueueIndex,
    removeFromQueue,
    clearUpcomingQueue,
    moveQueueItem,
    likedTrackIds,
    toggleLike,
  } = usePlayerStore();

  const { openContextMenu } = useContextMenuStore();

  // Close on Escape key
  useEffect(() => {
    if (!isQueueOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQueueOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQueueOpen, setIsQueueOpen]);

  if (!isQueueOpen) return null;

  const upcomingTracks = queueIndex >= 0 ? queue.slice(queueIndex + 1) : [];
  const previousTracks = queueIndex > 0 ? queue.slice(0, queueIndex) : [];

  const totalUpcomingSeconds = upcomingTracks.reduce(
    (acc, t) => acc + (t.duration || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Blurred Backdrop */}
      <div
        onClick={toggleQueue}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative z-10 w-full sm:w-[440px] md:w-[480px] h-full bg-[#08090D]/95 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <ListMusic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Playback Queue
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {upcomingTracks.length}{" "}
                {upcomingTracks.length === 1 ? "track" : "tracks"} upcoming •{" "}
                {formatDuration(totalUpcomingSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {upcomingTracks.length > 0 && (
              <button
                onClick={clearUpcomingQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Clear upcoming queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={toggleQueue}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Close Queue (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 select-none custom-scrollbar pb-32">
          {/* Section 1: Now Playing */}
          {currentTrack ? (
            <div>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block mb-3">
                Now Playing
              </span>

              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(currentTrack, { x: e.clientX, y: e.clientY });
                }}
                className="group p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent border border-[#D4AF37]/30 shadow-[inset_3px_0_0_#D4AF37] flex items-center justify-between gap-3.5 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Artwork with Equalizer Overlay */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-aether-highlight shrink-0 shadow border border-[#D4AF37]/40">
                    <img
                      src={getHighResThumbnail(
                        currentTrack.thumbnail,
                        currentTrack.id
                      )}
                      alt={currentTrack.title}
                      onError={(e) => handleImageError(e, currentTrack.id)}
                      className="w-full h-full object-cover"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="w-0.5 bg-[#D4AF37] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
                          <span className="w-0.5 bg-[#F3E5AB] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.15s] h-3" />
                          <span className="w-0.5 bg-[#D4AF37] rounded-full animate-[pulse_0.75s_ease-in-out_infinite_0.3s] h-full" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-semibold text-[#F3E5AB] truncate tracking-wide">
                      {currentTrack.title}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {currentTrack.artist}
                    </span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleLike(currentTrack)}
                    className={`p-1.5 rounded-lg transition ${
                      likedTrackIds.includes(currentTrack.id)
                        ? "text-[#D4AF37]"
                        : "text-zinc-500 hover:text-white"
                    }`}
                    title="The Vault"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        likedTrackIds.includes(currentTrack.id)
                          ? "fill-[#D4AF37]"
                          : ""
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openContextMenu(currentTrack, {
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition"
                    title="More options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No track currently active. Select a song to begin playback.
            </div>
          )}

          {/* Section 2: Next in Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                Next In Queue ({upcomingTracks.length})
              </span>
            </div>

            {upcomingTracks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2">
                <Volume2 className="w-6 h-6 text-zinc-600 mb-1" />
                <p className="text-xs text-zinc-400 font-medium">
                  Queue is empty
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Right-click any track or album in search to choose &ldquo;Play Next&rdquo; or &ldquo;Add to Queue&rdquo;.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingTracks.map((track, relativeIndex) => {
                  const absoluteIndex = queueIndex + 1 + relativeIndex;
                  const isTrackLiked = likedTrackIds.includes(track.id);

                  return (
                    <div
                      key={`${track.id}-${absoluteIndex}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openContextMenu(track, {
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      className="group flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition text-xs"
                    >
                      {/* Left: Position & Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <span className="text-[11px] font-mono text-zinc-600 w-4 text-center shrink-0">
                          {relativeIndex + 1}
                        </span>

                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-aether-highlight shrink-0 border border-white/10">
                          <img
                            src={getHighResThumbnail(track.thumbnail, track.id)}
                            alt={track.title}
                            onError={(e) => handleImageError(e, track.id)}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-white truncate group-hover:text-[#F3E5AB] transition">
                            {track.title}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Play Now Direct Button */}
                        <button
                          onClick={() => jumpToQueueIndex(absoluteIndex)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition opacity-0 group-hover:opacity-100"
                          title="Play now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Move Up */}
                        {relativeIndex > 0 && (
                          <button
                            onClick={() =>
                              moveQueueItem(absoluteIndex, absoluteIndex - 1)
                            }
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                            title="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Move Down */}
                        {relativeIndex < upcomingTracks.length - 1 && (
                          <button
                            onClick={() =>
                              moveQueueItem(absoluteIndex, absoluteIndex + 1)
                            }
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
                            title="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Remove from Queue */}
                        <button
                          onClick={() => removeFromQueue(absoluteIndex)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                          title="Remove from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* More Options / Context Menu */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openContextMenu(track, {
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition"
                          title="Options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Previously Played (if any) */}
          {previousTracks.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block mb-2">
                Previously Played ({previousTracks.length})
              </span>

              <div className="space-y-1 opacity-70 hover:opacity-100 transition-opacity">
                {previousTracks.slice(-5).map((track, i) => {
                  const originalIndex = previousTracks.length - 5 + i;
                  if (originalIndex < 0) return null;

                  return (
                    <div
                      key={`prev-${track.id}-${originalIndex}`}
                      className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="w-7 h-7 rounded-md overflow-hidden bg-aether-highlight shrink-0 border border-white/10">
                          <img
                            src={getHighResThumbnail(track.thumbnail, track.id)}
                            alt={track.title}
                            onError={(e) => handleImageError(e, track.id)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-zinc-300 truncate text-[11px]">
                            {track.title}
                          </span>
                          <span className="text-zinc-500 truncate text-[10px]">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => jumpToQueueIndex(originalIndex)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-[#D4AF37] transition text-[11px]"
                        title="Replay"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
