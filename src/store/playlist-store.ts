import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Track } from "@/types/music";
import { useAuthStore } from "./auth-store";
import { usePlayerStore } from "./player-store";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks?: Track[];
  tracksCount?: number;
  created_at?: string;
}

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;
  isCreateModalOpen: boolean;
  initialTab: "create" | "import";

  openCreateModal: (tab?: "create" | "import") => void;
  openImportModal: () => void;
  closeCreateModal: () => void;
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  importPlaylist: (name: string, tracks: Track[], coverUrl?: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  syncVaultWithCloud: () => Promise<void>;
  persistVaultTrack: (track: Track, isLiked: boolean) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],
      isLoading: false,
      isCreateModalOpen: false,
      initialTab: "create",

      openCreateModal: (tab: "create" | "import" = "create") =>
        set({ isCreateModalOpen: true, initialTab: tab }),

      openImportModal: () =>
        set({ isCreateModalOpen: true, initialTab: "import" }),

      closeCreateModal: () =>
        set({ isCreateModalOpen: false, initialTab: "create" }),

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
            const cloudPlaylists = data as Playlist[];
            const localOnly = get().playlists.filter((p) =>
              p.id.startsWith("local-pl-")
            );
            set({ playlists: [...cloudPlaylists, ...localOnly] });
          }
        } catch (e) {
          console.warn("Failed to fetch playlists:", e);
        }
        set({ isLoading: false });
      },

      createPlaylist: async (name, description) => {
        const user = useAuthStore.getState().user;

        if (isSupabaseConfigured() && user) {
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
              set((state) => ({
                playlists: [newPlaylist, ...state.playlists],
                isCreateModalOpen: false,
              }));
              return newPlaylist;
            }
          } catch (e) {
            console.warn("Failed to create playlist on cloud:", e);
          }
        }

        // Guest / local creation fallback
        const localPlaylist: Playlist = {
          id: `local-pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          description,
          tracks: [],
          tracksCount: 0,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [localPlaylist, ...state.playlists],
          isCreateModalOpen: false,
        }));
        return localPlaylist;
      },

      importPlaylist: async (name: string, tracks: Track[], coverUrl?: string) => {
        const user = useAuthStore.getState().user;

        if (isSupabaseConfigured() && user) {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from("playlists")
              .insert({
                user_id: user.id,
                name,
                description: `Imported collection • ${tracks.length} compositions`,
              })
              .select()
              .single();

            if (!error && data) {
              const playlistId = data.id;
              const rows = tracks.map((track, index) => ({
                playlist_id: playlistId,
                track_id: track.id,
                title: track.title,
                artist: track.artist,
                thumbnail: track.thumbnail,
                duration: track.duration,
                position: index,
              }));

              if (rows.length > 0) {
                await supabase.from("playlist_tracks").insert(rows);
              }

              const newPlaylist: Playlist = {
                id: playlistId,
                name: data.name,
                description: data.description,
                coverUrl,
                tracks,
                tracksCount: tracks.length,
                created_at: data.created_at,
              };

              set((state) => ({
                playlists: [
                  newPlaylist,
                  ...state.playlists.filter((p) => p.id !== playlistId),
                ],
                isCreateModalOpen: false,
              }));

              return playlistId;
            }
          } catch (e) {
            console.warn("Failed to save imported playlist to Supabase:", e);
          }
        }

        // Guest / local storage fallback
        const localId = `local-pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const localPlaylist: Playlist = {
          id: localId,
          name,
          description: `Imported collection • ${tracks.length} compositions`,
          coverUrl,
          tracks,
          tracksCount: tracks.length,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [localPlaylist, ...state.playlists],
          isCreateModalOpen: false,
        }));

        return localId;
      },

      deletePlaylist: async (id) => {
        if (isSupabaseConfigured() && !id.startsWith("local-pl-")) {
          try {
            const supabase = createClient();
            await supabase.from("playlists").delete().eq("id", id);
          } catch (e) {
            console.warn("Failed to delete playlist from Supabase:", e);
          }
        }
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        }));
      },

      addTrackToPlaylist: async (playlistId, track) => {
        const user = useAuthStore.getState().user;
        if (isSupabaseConfigured() && user && !playlistId.startsWith("local-pl-")) {
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
        }

        // Local storage update
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              const currentTracks = p.tracks || [];
              return {
                ...p,
                tracks: [...currentTracks, track],
                tracksCount: (p.tracksCount || currentTracks.length) + 1,
              };
            }
            return p;
          }),
        }));
        return true;
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
        if (!user) return;

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
    }),
    {
      name: "aether-playlists-storage",
      partialize: (state) => ({ playlists: state.playlists }),
    }
  )
);
