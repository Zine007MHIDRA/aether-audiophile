"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ListMusic, Play, Trash2, Clock, Sparkles, Compass } from "lucide-react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/TrackRow";
import { usePlayerStore } from "@/store/player-store";
import { usePlaylistStore, Playlist } from "@/store/playlist-store";

const CHUNK_SIZE = 100;

export default function PlaylistPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [loading, setLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const playTrack = usePlayerStore((state) => state.playTrack);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);
  const storePlaylists = usePlaylistStore((state) => state.playlists);

  // Sync state reactively when background resolver resolves tracks
  useEffect(() => {
    const local = storePlaylists.find((p) => p.id === id);
    if (local && local.tracks && local.tracks.length > 0) {
      setPlaylist(local);
      setTracks(local.tracks);
    }
  }, [storePlaylists, id]);

  useEffect(() => {
    setVisibleCount(CHUNK_SIZE);
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
          .select("id, name, description, created_at")
          .eq("id", id)
          .single();

        if (plData) {
          setPlaylist(plData as Playlist);
        } else if (local) {
          setPlaylist(local);
        }

        // Fetch playlist tracks
        const { data: trData } = await supabase
          .from("playlist_tracks")
          .select("track_id, title, artist, thumbnail, duration, position")
          .eq("playlist_id", id)
          .order("position", { ascending: true });

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

  // Progressive rendering: IntersectionObserver infinite scroll in chunks of 100
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

  const visibleTracks = tracks.slice(0, visibleCount);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-aether-surface via-aether-elevated to-aether-dark p-6 md:p-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-aether-border/30">
        <div className="flex items-center sm:items-end gap-5">
          <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-aether-surface via-aether-elevated to-aether-highlight border border-aether-gold/40 flex items-center justify-center text-aether-gold shadow-gold-glow shrink-0 overflow-hidden">
            {playlist?.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ListMusic className="w-10 h-10 sm:w-16 sm:h-16 text-aether-gold" />
            )}
          </div>
          <div className="flex flex-col gap-1 sm:gap-2 max-w-xl">
            <div className="flex items-center gap-2 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Custom Playlist</span>
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
              <span>{tracks.length} {tracks.length === 1 ? "Composition" : "Compositions"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {tracks.length > 0 && (
            <button
              onClick={() => playTrack(tracks[0], tracks)}
              className="flex items-center gap-2.5 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-full shadow-gold-glow hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Play Playlist</span>
            </button>
          )}
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
      <div className="p-4 md:p-8 flex-1 flex flex-col gap-6">
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
                  tracksContext={tracks}
                />
              ))}
            </div>

            {/* Progressive Loading Sentinel and Manual Action Button */}
            {visibleCount < tracks.length && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div ref={loadMoreRef} className="h-4 w-full pointer-events-none" />
                <button
                  onClick={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + CHUNK_SIZE, tracks.length)
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-aether-elevated hover:bg-aether-highlight border border-aether-gold/30 hover:border-aether-gold text-aether-gold text-xs font-mono tracking-wider transition shadow-sm hover:scale-105 active:scale-95"
                >
                  <span>
                    Showing {visibleCount} of {tracks.length} compositions • Load 100 more
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
