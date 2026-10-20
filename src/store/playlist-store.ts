import { create } from "zustand";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Track } from "@/types/music";
import { useAuthStore } from "./auth-store";
import { usePlayerStore } from "./player-store";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracksCount?: number;
  created_at?: string;
}

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;
  isCreateModalOpen: boolean;

  openCreateModal: () => void;
  closeCreateModal: () => void;
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  syncVaultWithCloud: () => Promise<void>;
  persistVaultTrack: (track: Track, isLiked: boolean) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: false,
  isCreateModalOpen: false,

  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),

  fetchPlaylists: async () => {
    if (!isSupabaseConfigured()) return;
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("playlists")
        .select("id, name, description, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        set({ playlists: data as Playlist[] });
      }
    } catch (e) {
      console.warn("Failed to fetch playlists:", e);
    }
    set({ isLoading: false });
  },

  createPlaylist: async (name, description) => {
    if (!isSupabaseConfigured()) return null;
    const user = useAuthStore.getState().user;
    if (!user) {
      useAuthStore.getState().openAuthModal();
      return null;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: user.id,
          name,
          description,
        })
        .select()
        .single();

      if (!error && data) {
        const newPlaylist = data as Playlist;
        set((state) => ({ playlists: [newPlaylist, ...state.playlists], isCreateModalOpen: false }));
        return newPlaylist;
      }
    } catch (e) {
      console.warn("Failed to create playlist:", e);
    }
    return null;
  },

  deletePlaylist: async (id) => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.from("playlists").delete().eq("id", id);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    }));
  },

  addTrackToPlaylist: async (playlistId, track) => {
    if (!isSupabaseConfigured()) return false;
    const user = useAuthStore.getState().user;
    if (!user) {
      useAuthStore.getState().openAuthModal();
      return false;
    }

    const supabase = createClient();
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    });

    return !error;
  },

  syncVaultWithCloud: async () => {
    if (!isSupabaseConfigured()) return;
    const user = useAuthStore.getState().user;
    if (!user) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("vault_tracks")
      .select("track_id, title, artist, thumbnail, duration")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const tracks: Track[] = data.map((d: any) => ({
        id: d.track_id,
        title: d.title,
        artist: d.artist,
        thumbnail: d.thumbnail,
        duration: d.duration || 0,
        durationFormatted: `${Math.floor((d.duration || 0) / 60)}:${(d.duration || 0) % 60 < 10 ? "0" : ""}${(d.duration || 0) % 60}`,
      }));

      const playerStore = usePlayerStore.getState();
      const existing = playerStore.likedTracks;
      
      // Merge unique tracks
      const map = new Map<string, Track>();
      tracks.forEach((t) => map.set(t.id, t));
      existing.forEach((t) => map.set(t.id, t));

      const merged = Array.from(map.values());
      const likedTrackIds = merged.map((t) => t.id);

      usePlayerStore.setState({
        likedTracks: merged,
        likedTrackIds,
      });
    }
  },

  persistVaultTrack: async (track, isLiked) => {
    if (!isSupabaseConfigured()) return;
    const user = useAuthStore.getState().user;
    if (!user) return; // Stored in localStorage by default

    const supabase = createClient();
    if (isLiked) {
      await supabase.from("vault_tracks").upsert({
        user_id: user.id,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
      });
    } else {
      await supabase
        .from("vault_tracks")
        .delete()
        .eq("user_id", user.id)
        .eq("track_id", track.id);
    }
  },
}));
