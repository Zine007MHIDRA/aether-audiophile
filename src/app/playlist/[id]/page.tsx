"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ListMusic,
  Play,
  Trash2,
  Clock,
  Sparkles,
  Compass,
  Edit3,
  Download,
  Cloud,
  CloudUpload,
  CheckCircle,
  Search,
  Copy,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";
import {
  usePlaylistStore,
  Playlist,
  PLAYLIST_GRADIENT_PRESETS,
} from "@/store/playlist-store";
import { useAuthStore } from "@/store/auth-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

const CHUNK_SIZE = 200;

export default function PlaylistPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const user = useAuthStore((state) => state.user);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const {
    playlists: storePlaylists,
    deletePlaylist,
    openEditModal,
    exportPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    syncAllLocalPlaylistsToCloud,
  } = usePlaylistStore();

  const isLocal = id?.startsWith("local-pl-");

  // Sync state reactively when background resolver or edit modal updates playlist
  useEffect(() => {
    const local = storePlaylists.find((p) => p.id === id);
    if (local) {
      setPlaylist(local);
      if (local.tracks && local.tracks.length > 0) {
        setTracks(local.tracks);
      }
    }
  }, [storePlaylists, id]);

  useEffect(() => {
    setVisibleCount(CHUNK_SIZE);
    setFilterQuery("");
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // 1. Check local playlist from Zustand store
    const local = usePlaylistStore
      .getState()
      .playlists.find((p) => p.id === id);

    if (local && local.tracks && local.tracks.length > 0) {
      setPlaylist(local);
      setTracks(local.tracks);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      if (local) {
        setPlaylist(local);
        setTracks(local.tracks || []);
      }
      setLoading(false);
      return;
    }

    const loadPlaylistData = async () => {
      try {
        const supabase = createClient();

        // Fetch playlist details
        const { data: plData } = await supabase
          .from("playlists")
          .select("id, name, description, cover_url, created_at")
          .eq("id", id)
          .single();

        if (plData) {
          const loadedPl: Playlist = {
            id: plData.id,
            name: plData.name,
            description: plData.description,
            coverUrl: plData.cover_url,
            created_at: plData.created_at,
          };
          setPlaylist(loadedPl);
        } else if (local) {
          setPlaylist(local);
        }

        // Fetch playlist tracks (uncapped up to 5,000 tracks)
        const { data: trData } = await supabase
          .from("playlist_tracks")
          .select("track_id, title, artist, thumbnail, duration, position")
          .eq("playlist_id", id)
          .order("position", { ascending: true })
          .limit(5000)
          .range(0, 4999);

        if (trData && trData.length > 0) {
          const list: Track[] = trData.map((d: any) => ({
            id: d.track_id,
            title: d.title,
            artist: d.artist,
            thumbnail: d.thumbnail,
            duration: d.duration || 0,
            durationFormatted: `${Math.floor((d.duration || 0) / 60)}:${(d.duration || 0) % 60 < 10 ? "0" : ""}${(d.duration || 0) % 60}`,
          }));
          setTracks(list);
        } else if (local?.tracks) {
          setTracks(local.tracks);
        }
      } catch {
        if (local?.tracks) {
          setTracks(local.tracks);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPlaylistData();
  }, [id]);

  // Progressive rendering: IntersectionObserver infinite scroll in chunks
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, tracks.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [tracks.length, visibleCount]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    await deletePlaylist(id);
    router.push("/");
  };

  const handleManualSync = async () => {
    if (!user) {
      alert("Please sign in to synchronize local collections to Supabase Cloud.");
      return;
    }
    setIsSyncing(true);
    try {
      await syncAllLocalPlaylistsToCloud();
      // If synced, route to the newly synced ID if changed
      const updated = usePlaylistStore
        .getState()
        .playlists.find((p) => p.name === playlist?.name);
      if (updated && updated.id !== id) {
        router.push(`/playlist/${updated.id}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveUp = async (idx: number) => {
    await reorderPlaylistTracks(id, idx, idx - 1);
    setTracks((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = async (idx: number) => {
    await reorderPlaylistTracks(id, idx, idx + 1);
    setTracks((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  const handleRemove = async (trackId: string, idx: number) => {
    await removeTrackFromPlaylist(id, trackId, idx);
    setTracks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Artwork resolution
  const isPresetCover = playlist?.coverUrl?.startsWith("preset:");
  const activePreset = isPresetCover
    ? PLAYLIST_GRADIENT_PRESETS.find(
        (p) => p.id === playlist?.coverUrl?.replace("preset:", "")
      )
    : null;

  // Total runtime formatting
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const runtimeFormatted =
    hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

  // Filtered tracks
  const filteredTracks = filterQuery.trim()
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(filterQuery.toLowerCase()) ||
          (t.album && t.album.toLowerCase().includes(filterQuery.toLowerCase()))
      )
    : tracks;

  const visibleTracks = filteredTracks.slice(0, visibleCount);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-aether-surface via-aether-elevated to-aether-dark p-6 md:p-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-aether-border/30">
        <div className="flex items-center sm:items-end gap-5">
          {/* Cover Artwork */}
          <div
            className={`w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl border border-aether-gold/40 flex items-center justify-center text-aether-gold shadow-gold-glow shrink-0 overflow-hidden relative ${
              activePreset
                ? `bg-gradient-to-br ${activePreset.css}`
                : "bg-gradient-to-br from-aether-surface via-aether-elevated to-aether-highlight"
            }`}
          >
            {activePreset ? (
              <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                <ListMusic className="w-10 h-10 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/80 font-bold hidden sm:block">
                  {activePreset.name}
                </span>
              </div>
            ) : playlist?.coverUrl ? (
              <img
                src={getHighResThumbnail(playlist.coverUrl)}
                alt={playlist.name}
                onError={(e) => handleImageError(e)}
                className="w-full h-full object-cover"
              />
            ) : (
              <ListMusic className="w-10 h-10 sm:w-16 sm:h-16 text-aether-gold" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1 sm:gap-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Custom Playlist</span>
              </span>

              {/* Cloud Sync Status Pill */}
              {isLocal ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[10px] font-mono">
                  <Cloud className="w-2.5 h-2.5" />
                  <span>Local Studio Vault</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[10px] font-mono">
                  <CheckCircle className="w-2.5 h-2.5" />
                  <span>Cloud Synchronized</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              {playlist?.name || "Curated Playlist"}
            </h1>

            {playlist?.description && (
              <p className="text-aether-subdued text-xs font-light leading-relaxed">
                {playlist.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-aether-subdued mt-1 font-mono">
              <span>
                {tracks.length} {tracks.length === 1 ? "Composition" : "Compositions"}
              </span>
              <span>•</span>
              <span className="text-zinc-400">{runtimeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {tracks.length > 0 && (
            <button
              onClick={() => playTrack(tracks[0], tracks)}
              className="flex items-center gap-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-full shadow-gold-glow hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Play</span>
            </button>
          )}

          {/* Edit Collection Modal Trigger */}
          {playlist && (
            <button
              onClick={() => openEditModal(playlist)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-aether-border/60 hover:border-aether-gold/40 text-zinc-300 hover:text-[#D4AF37] text-xs font-medium transition"
              title="Edit Collection & Artwork"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {/* Cloud Sync Button (if local and user logged in) */}
          {isLocal && user && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition disabled:opacity-50"
              title="Upload to Supabase Cloud"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>Sync Cloud</span>
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-aether-border/60 text-zinc-300 hover:text-white text-xs font-medium transition"
              title="Export Playlist"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-aether-surface border border-aether-border/80 rounded-xl p-1.5 shadow-2xl z-20 flex flex-col gap-1">
                <button
                  onClick={() => {
                    exportPlaylist(id, "m3u");
                    setExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Download .M3U8</span>
                </button>
                <button
                  onClick={() => {
                    exportPlaylist(id, "json");
                    setExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Download .JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Delete Playlist Button */}
          <button
            onClick={handleDelete}
            className="p-3 rounded-full hover:bg-rose-950/40 border border-aether-border/60 hover:border-rose-700/60 text-aether-subdued hover:text-rose-400 transition"
            title="Delete Playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tracklist */}
      <div className="p-4 md:p-8 flex-1 flex flex-col gap-5">
        {/* In-playlist Search & Filter */}
        {tracks.length > 5 && (
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter tracks in playlist..."
                className="w-full bg-aether-dark/80 border border-aether-border/50 rounded-xl text-white text-xs pl-8 pr-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-aether-gold transition"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono text-zinc-500 hidden sm:block">
              {filteredTracks.length} of {tracks.length} compositions
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-aether-gold text-xs font-mono tracking-widest uppercase animate-pulse py-12 text-center">
            Fetching playlist compositions...
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <ListMusic className="w-12 h-12 text-aether-muted stroke-[1.5]" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              This playlist has no compositions yet
            </h2>
            <p className="text-aether-subdued text-xs max-w-sm leading-relaxed">
              Find tracks in Discover or Search to add them to this playlist.
            </p>
            <Link
              href="/search"
              className="flex items-center gap-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-gold-glow mt-3"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-aether-border/30 pb-2 px-3 flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest mb-2">
              <div className="flex items-center gap-4">
                <span className="w-5 text-center">#</span>
                <span>Composition</span>
              </div>
              <div className="flex items-center gap-6">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex flex-col">
              {visibleTracks.map((track, idx) => (
                <TrackRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  tracksContext={filteredTracks}
                  onMoveUp={
                    idx > 0 && !filterQuery.trim()
                      ? () => handleMoveUp(idx)
                      : undefined
                  }
                  onMoveDown={
                    idx < tracks.length - 1 && !filterQuery.trim()
                      ? () => handleMoveDown(idx)
                      : undefined
                  }
                  onRemove={() => handleRemove(track.id, idx)}
                />
              ))}
            </div>

            {/* Progressive Loading Sentinel and Actions */}
            {visibleCount < filteredTracks.length && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div ref={loadMoreRef} className="h-4 w-full pointer-events-none" />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(prev + CHUNK_SIZE, filteredTracks.length)
                      )
                    }
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-aether-elevated hover:bg-aether-highlight border border-aether-gold/30 hover:border-aether-gold text-aether-gold text-xs font-mono tracking-wider transition shadow-sm hover:scale-105 active:scale-95"
                  >
                    <span>
                      Showing {visibleCount} of {filteredTracks.length} compositions • Load 200 more
                    </span>
                  </button>
                  <button
                    onClick={() => setVisibleCount(filteredTracks.length)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-aether-surface hover:bg-aether-elevated border border-aether-border/60 hover:border-aether-gold/50 text-white text-xs font-mono tracking-wider transition shadow-sm hover:scale-105 active:scale-95"
                  >
                    <span>Show All ({filteredTracks.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
