"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CornerDownRight,
  ListPlus,
  Bookmark,
  FolderPlus,
  User,
  Link2,
  Plus,
  Check,
  ChevronRight,
  ListMusic,
} from "lucide-react";
import { useContextMenuStore } from "@/store/context-menu-store";
import { usePlayerStore } from "@/store/player-store";
import { usePlaylistStore } from "@/store/playlist-store";
import { getHighResThumbnail } from "@/lib/image";

export function TrackContextMenu() {
  const router = useRouter();
  const {
    isOpen,
    position,
    track,
    tracksContext,
    closeContextMenu,
    showToast,
    toastMessage,
  } = useContextMenuStore();

  const { playTrack, playNext, addToQueue, toggleLike, likedTrackIds } =
    usePlayerStore();
  const { playlists, addTrackToPlaylist, openCreateModal } = usePlaylistStore();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });
  const [openSubmenuLeft, setOpenSubmenuLeft] = useState(false);

  const isLiked = track ? likedTrackIds.includes(track.id) : false;

  // Viewport clamping & position adjustment
  useEffect(() => {
    if (!isOpen) {
      setShowPlaylistSubmenu(false);
      return;
    }

    const menuWidth = 240;
    const menuHeight = 360;
    const padding = 16;

    let x = position.x;
    let y = position.y;

    // Check right edge
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Check bottom edge
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }

    // Check if submenu should open to the left
    if (x + menuWidth + 220 > window.innerWidth - padding) {
      setOpenSubmenuLeft(true);
    } else {
      setOpenSubmenuLeft(false);
    }

    setAdjustedPos({
      x: Math.max(padding, x),
      y: Math.max(padding, y),
    });
  }, [isOpen, position]);

  // Click outside / escape / scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    };

    const handleScroll = () => {
      closeContextMenu();
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, closeContextMenu]);

  if (!isOpen && !toastMessage) return null;

  // Handlers
  const handlePlayNow = () => {
    if (!track) return;
    playTrack(track, tracksContext);
    closeContextMenu();
  };

  const handlePlayNext = () => {
    if (!track) return;
    playNext(track);
    showToast(`"${track.title}" will play next`);
    closeContextMenu();
  };

  const handleAddToQueue = () => {
    if (!track) return;
    addToQueue(track);
    showToast(`Added "${track.title}" to queue`);
    closeContextMenu();
  };

  const handleToggleVault = () => {
    if (!track) return;
    toggleLike(track);
    showToast(
      isLiked
        ? `Removed from The Vault`
        : `Saved "${track.title}" to The Vault`
    );
    closeContextMenu();
  };

  const handleAddToSpecificPlaylist = async (
    playlistId: string,
    playlistName: string
  ) => {
    if (!track) return;
    const ok = await addTrackToPlaylist(playlistId, track);
    if (ok) {
      showToast(`Added to "${playlistName}"`);
    } else {
      showToast(`Could not add to playlist`);
    }
    closeContextMenu();
  };

  const handleCreateNewPlaylist = () => {
    closeContextMenu();
    openCreateModal("create");
  };

  const handleGoToArtist = () => {
    if (!track) return;
    closeContextMenu();
    router.push(`/search?q=${encodeURIComponent(track.artist)}`);
  };

  const handleCopyShareLink = async () => {
    if (!track) return;
    const query = `${track.title} ${track.artist}`.trim();
    const url = `${window.location.origin}/search?q=${encodeURIComponent(query)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Share link copied to clipboard");
    } catch {
      showToast("Failed to copy link");
    }
    closeContextMenu();
  };

  return (
    <>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-950/95 border border-[#D4AF37]/40 text-[#F3E5AB] text-xs font-medium shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.2)] backdrop-blur-xl">
            <div className="w-4 h-4 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-[#D4AF37]" />
            </div>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Context Menu Container */}
      {isOpen && track && (
        <div
          ref={menuRef}
          style={{
            top: `${adjustedPos.y}px`,
            left: `${adjustedPos.x}px`,
          }}
          className="fixed z-[90] w-60 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(230,194,128,0.15)] py-2 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Preview */}
          <div className="flex items-center gap-3 px-3.5 py-2 mb-1.5 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-aether-elevated shrink-0 border border-white/10">
              <img
                src={getHighResThumbnail(track.thumbnail, track.id)}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="font-semibold text-white truncate text-xs">
                {track.title}
              </span>
              <span className="text-zinc-400 text-[11px] truncate">
                {track.artist}
              </span>
            </div>
          </div>

          {/* Action Items */}
          <div className="flex flex-col px-1.5 space-y-0.5">
            <button
              onClick={handlePlayNow}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <Play className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
              <span>Play Now</span>
            </button>

            <button
              onClick={handlePlayNext}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-400" />
              <span>Play Next</span>
            </button>

            <button
              onClick={handleAddToQueue}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add to Queue</span>
            </button>

            <button
              onClick={handleToggleVault}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isLiked
                    ? "fill-[#D4AF37] text-[#D4AF37]"
                    : "text-zinc-400"
                }`}
              />
              <span>{isLiked ? "Remove from The Vault" : "Save to The Vault"}</span>
            </button>

            {/* Add to Playlist Flyout Menu */}
            <div
              className="relative"
              onMouseEnter={() => setShowPlaylistSubmenu(true)}
              onMouseLeave={() => setShowPlaylistSubmenu(false)}
            >
              <button
                type="button"
                onClick={() => setShowPlaylistSubmenu((prev) => !prev)}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Add to Playlist</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Nested Playlist Submenu */}
              {showPlaylistSubmenu && (
                <div
                  style={{
                    left: openSubmenuLeft ? "-228px" : "228px",
                  }}
                  className="absolute top-0 w-56 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 flex flex-col gap-0.5 max-h-60 overflow-y-auto animate-in fade-in duration-100 z-10"
                >
                  <button
                    onClick={handleCreateNewPlaylist}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-[#D4AF37] hover:bg-[#D4AF37]/15 transition font-medium text-left"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Playlist...</span>
                  </button>

                  {playlists.length > 0 && (
                    <div className="h-px bg-white/10 my-1" />
                  )}

                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() =>
                        handleAddToSpecificPlaylist(pl.id, pl.name)
                      }
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition text-left truncate"
                    >
                      <ListMusic className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 my-1" />

            <button
              onClick={handleGoToArtist}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Go to Artist</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition text-left"
            >
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Share Link</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
