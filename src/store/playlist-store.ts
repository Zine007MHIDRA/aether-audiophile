import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Track } from "@/types/music";
import { useAuthStore } from "./auth-store";
import { usePlayerStore } from "./player-store";
import { useContextMenuStore } from "./context-menu-store";

export interface PlaylistGradientPreset {
  id: string;
  name: string;
  css: string;
  badge: string;
}

export const PLAYLIST_GRADIENT_PRESETS: PlaylistGradientPreset[] = [
  {
    id: "gold",
    name: "Obsidian Gold",
    css: "from-[#C5A059] via-[#D4AF37] to-[#060709]",
    badge: "Audiophile",
  },
  {
    id: "emerald",
    name: "Emerald Velvet",
    css: "from-emerald-600 via-teal-950 to-black",
    badge: "Acoustic",
  },
  {
    id: "midnight",
    name: "Sapphire Midnight",
    css: "from-blue-600 via-indigo-950 to-black",
    badge: "Atmospheric",
  },
  {
    id: "crimson",
    name: "Royal Crimson",
    css: "from-rose-600 via-rose-950 to-black",
    badge: "Dynamic",
  },
  {
    id: "amethyst",
    name: "Amethyst Dusk",
    css: "from-purple-600 via-purple-950 to-black",
    badge: "Electronic",
  },
  {
    id: "monolith",
    name: "Pure Monolith",
    css: "from-zinc-700 via-zinc-900 to-black",
    badge: "Master",
  },
];

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks?: Track[];
  tracksCount?: number;
  created_at?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  resolved: number;
  total: number;
}

interface PlaylistState {
  playlists: Playlist[];
  isLoading: boolean;
  isCreateModalOpen: boolean;
  initialTab: "create" | "import";
  isEditModalOpen: boolean;
  activeEditPlaylist: Playlist | null;
  syncStatus: SyncStatus | null;

  openCreateModal: (tab?: "create" | "import") => void;
  openImportModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (playlist: Playlist) => void;
  closeEditModal: () => void;
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (
    name: string,
    description?: string,
    coverUrl?: string,
    seedTracks?: Track[]
  ) => Promise<Playlist | null>;
  updatePlaylist: (
    id: string,
    updates: { name?: string; description?: string; coverUrl?: string }
  ) => Promise<boolean>;
  importPlaylist: (name: string, tracks: Track[], coverUrl?: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<void>;
  duplicatePlaylist: (playlistId: string) => Promise<string | null>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  removeTrackFromPlaylist: (
    playlistId: string,
    trackId: string,
    position?: number
  ) => Promise<boolean>;
  reorderPlaylistTracks: (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => Promise<boolean>;
  exportPlaylist: (playlistId: string, format?: "m3u" | "json") => void;
  syncAllLocalPlaylistsToCloud: () => Promise<{ synced: number; errors: number }>;
  syncVaultWithCloud: () => Promise<void>;
  persistVaultTrack: (track: Track, isLiked: boolean) => Promise<void>;
  resolveTrackInPlaylists: (oldId: string, updatedTrack: Partial<Track>) => Promise<void>;
  startBackgroundSync: () => void;
  stopBackgroundSync: () => void;
}

let backgroundTimer: NodeJS.Timeout | null = null;
const inFlightIds = new Set<string>();

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],
      isLoading: false,
      isCreateModalOpen: false,
      initialTab: "create",
      isEditModalOpen: false,
      activeEditPlaylist: null,
      syncStatus: null,

      openCreateModal: (tab: "create" | "import" = "create") =>
        set({ isCreateModalOpen: true, initialTab: tab }),

      openImportModal: () =>
        set({ isCreateModalOpen: true, initialTab: "import" }),

      closeCreateModal: () =>
        set({ isCreateModalOpen: false, initialTab: "create" }),

      openEditModal: (playlist: Playlist) =>
        set({ isEditModalOpen: true, activeEditPlaylist: playlist }),

      closeEditModal: () =>
        set({ isEditModalOpen: false, activeEditPlaylist: null }),

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

      createPlaylist: async (name, description, coverUrl, seedTracks = []) => {
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
              const playlistId = data.id;

              if (seedTracks.length > 0) {
                const rows = seedTracks.map((t, idx) => ({
                  playlist_id: playlistId,
                  track_id: t.id,
                  title: t.title,
                  artist: t.artist,
                  thumbnail: t.thumbnail,
                  duration: t.duration,
                  position: idx,
                }));
                await supabase.from("playlist_tracks").insert(rows);
              }

              const newPlaylist: Playlist = {
                ...data,
                coverUrl,
                tracks: seedTracks,
                tracksCount: seedTracks.length,
              };

              set((state) => ({
                playlists: [newPlaylist, ...state.playlists],
                isCreateModalOpen: false,
              }));
              useContextMenuStore.getState().showToast(`Created collection "${name}"`);
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
          coverUrl,
          tracks: seedTracks,
          tracksCount: seedTracks.length,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [localPlaylist, ...state.playlists],
          isCreateModalOpen: false,
        }));
        useContextMenuStore.getState().showToast(`Created collection "${name}"`);
        return localPlaylist;
      },

      updatePlaylist: async (id, updates) => {
        const user = useAuthStore.getState().user;
        let success = true;

        if (isSupabaseConfigured() && user && !id.startsWith("local-pl-")) {
          try {
            const supabase = createClient();
            const { error } = await supabase
              .from("playlists")
              .update({
                name: updates.name,
                description: updates.description,
              })
              .eq("id", id);
            if (error) success = false;
          } catch (e) {
            console.warn("Failed to update playlist on cloud:", e);
            success = false;
          }
        }

        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === id) {
              return {
                ...p,
                ...(updates.name ? { name: updates.name } : {}),
                ...(updates.description !== undefined ? { description: updates.description } : {}),
                ...(updates.coverUrl !== undefined ? { coverUrl: updates.coverUrl } : {}),
              };
            }
            return p;
          }),
          isEditModalOpen: false,
          activeEditPlaylist: null,
        }));

        useContextMenuStore.getState().showToast("Playlist updated");
        return success;
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

              // Chunk database inserts into batches of 200 rows per request
              const chunkSize = 200;
              for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                const { error: chunkErr } = await supabase
                  .from("playlist_tracks")
                  .insert(chunk);
                if (chunkErr) {
                  console.warn("Error inserting chunk into playlist_tracks:", chunkErr);
                }
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

              // Start background resolution if any tracks are pending
              const pendingCount = tracks.filter((t) =>
                t.id.startsWith("pending:")
              ).length;
              if (pendingCount > 0) {
                set({
                  syncStatus: {
                    isSyncing: true,
                    resolved: tracks.length - pendingCount,
                    total: tracks.length,
                  },
                });
                get().startBackgroundSync();
              }

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

        // Start background resolution for guest local playlist
        const pendingCount = tracks.filter((t) =>
          t.id.startsWith("pending:")
        ).length;
        if (pendingCount > 0) {
          set({
            syncStatus: {
              isSyncing: true,
              resolved: tracks.length - pendingCount,
              total: tracks.length,
            },
          });
          get().startBackgroundSync();
        }

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
        useContextMenuStore.getState().showToast("Playlist deleted");
      },

      duplicatePlaylist: async (playlistId) => {
        const pl = get().playlists.find((p) => p.id === playlistId);
        if (!pl) return null;
        const newName = `${pl.name} (Copy)`;
        const newDesc = pl.description
          ? `${pl.description} • Duplicated`
          : "Duplicated playlist";
        const copy = await get().createPlaylist(
          newName,
          newDesc,
          pl.coverUrl,
          pl.tracks || []
        );
        if (copy) {
          useContextMenuStore.getState().showToast(`Duplicated "${newName}"`);
          return copy.id;
        }
        return null;
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

          if (!error) {
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
          }
          return false;
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

      removeTrackFromPlaylist: async (playlistId, trackId, position) => {
        const user = useAuthStore.getState().user;
        let success = true;

        if (isSupabaseConfigured() && user && !playlistId.startsWith("local-pl-")) {
          try {
            const supabase = createClient();
            let query = supabase
              .from("playlist_tracks")
              .delete()
              .eq("playlist_id", playlistId)
              .eq("track_id", trackId);
            if (typeof position === "number") {
              query = query.eq("position", position);
            }
            const { error } = await query;
            if (error) success = false;
          } catch (e) {
            console.warn("Failed to delete track from Supabase:", e);
            success = false;
          }
        }

        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              const currentTracks = p.tracks || [];
              let updatedTracks: Track[];
              if (typeof position === "number") {
                updatedTracks = currentTracks.filter((_, idx) => idx !== position);
              } else {
                const targetIdx = currentTracks.findIndex((t) => t.id === trackId);
                updatedTracks =
                  targetIdx >= 0
                    ? currentTracks.filter((_, idx) => idx !== targetIdx)
                    : currentTracks;
              }
              return {
                ...p,
                tracks: updatedTracks,
                tracksCount: updatedTracks.length,
              };
            }
            return p;
          }),
        }));

        useContextMenuStore.getState().showToast("Composition removed from playlist");
        return success;
      },

      reorderPlaylistTracks: async (playlistId, fromIndex, toIndex) => {
        const pl = get().playlists.find((p) => p.id === playlistId);
        if (!pl || !pl.tracks || fromIndex === toIndex) return false;

        const updatedTracks = [...pl.tracks];
        const [movedItem] = updatedTracks.splice(fromIndex, 1);
        updatedTracks.splice(toIndex, 0, movedItem);

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, tracks: updatedTracks } : p
          ),
        }));

        const user = useAuthStore.getState().user;
        if (isSupabaseConfigured() && user && !playlistId.startsWith("local-pl-")) {
          try {
            const supabase = createClient();
            const updates = updatedTracks.map((t, idx) =>
              supabase
                .from("playlist_tracks")
                .update({ position: idx })
                .eq("playlist_id", playlistId)
                .eq("track_id", t.id)
            );
            await Promise.all(updates);
          } catch (e) {
            console.warn("Failed to persist reordered tracks to cloud:", e);
          }
        }

        return true;
      },

      exportPlaylist: (playlistId, format = "m3u") => {
        const pl = get().playlists.find((p) => p.id === playlistId);
        if (!pl) return;
        const safeName = pl.name.replace(/[^a-zA-Z0-9_-]/g, "_");

        if (format === "json") {
          const exportData = {
            aetherFormatVersion: "1.0",
            name: pl.name,
            description: pl.description || "",
            coverUrl: pl.coverUrl || "",
            exportedAt: new Date().toISOString(),
            compositionsCount: (pl.tracks || []).length,
            tracks: pl.tracks || [],
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName}.json`;
          a.click();
          URL.revokeObjectURL(url);
          useContextMenuStore.getState().showToast(`Exported "${pl.name}.json"`);
        } else {
          let m3u = `#EXTM3U\n#PLAYLIST:${pl.name}\n\n`;
          (pl.tracks || []).forEach((t) => {
            m3u += `#EXTINF:${t.duration || -1},${t.artist} - ${t.title}\n`;
            m3u += `https://www.youtube.com/watch?v=${t.id}\n\n`;
          });
          const blob = new Blob([m3u], { type: "audio/x-mpegurl" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName}.m3u8`;
          a.click();
          URL.revokeObjectURL(url);
          useContextMenuStore.getState().showToast(`Exported "${pl.name}.m3u8"`);
        }
      },

      syncAllLocalPlaylistsToCloud: async () => {
        if (!isSupabaseConfigured()) {
          useContextMenuStore.getState().showToast("Supabase cloud is not configured");
          return { synced: 0, errors: 0 };
        }
        const user = useAuthStore.getState().user;
        if (!user) {
          useContextMenuStore.getState().showToast("Sign in to sync local playlists to cloud");
          return { synced: 0, errors: 0 };
        }

        const localPlaylists = get().playlists.filter((p) =>
          p.id.startsWith("local-pl-")
        );
        if (localPlaylists.length === 0) {
          useContextMenuStore.getState().showToast("All playlists are already cloud-synced");
          return { synced: 0, errors: 0 };
        }

        let synced = 0;
        let errors = 0;
        const supabase = createClient();

        for (const local of localPlaylists) {
          try {
            const { data, error } = await supabase
              .from("playlists")
              .insert({
                user_id: user.id,
                name: local.name,
                description: local.description,
              })
              .select()
              .single();

            if (!error && data) {
              const cloudId = data.id;
              if (local.tracks && local.tracks.length > 0) {
                const rows = local.tracks.map((t, idx) => ({
                  playlist_id: cloudId,
                  track_id: t.id,
                  title: t.title,
                  artist: t.artist,
                  thumbnail: t.thumbnail,
                  duration: t.duration,
                  position: idx,
                }));

                const chunkSize = 200;
                for (let i = 0; i < rows.length; i += chunkSize) {
                  await supabase
                    .from("playlist_tracks")
                    .insert(rows.slice(i, i + chunkSize));
                }
              }

              // Replace local playlist with cloud playlist
              const updatedCloudPl: Playlist = {
                ...local,
                id: cloudId,
              };

              set((state) => ({
                playlists: state.playlists.map((p) =>
                  p.id === local.id ? updatedCloudPl : p
                ),
              }));
              synced++;
            } else {
              errors++;
            }
          } catch (e) {
            console.warn("Failed to sync playlist to cloud:", e);
            errors++;
          }
        }

        useContextMenuStore
          .getState()
          .showToast(`Synced ${synced} playlist${synced > 1 ? "s" : ""} to Aether Cloud`);
        return { synced, errors };
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

      resolveTrackInPlaylists: async (oldId: string, updatedTrack: Partial<Track>) => {
        set((state) => {
          let anyUpdated = false;
          const playlists = state.playlists.map((pl) => {
            if (!pl.tracks) return pl;
            let plChanged = false;
            const updatedTracks = pl.tracks.map((t) => {
              if (t.id === oldId) {
                plChanged = true;
                anyUpdated = true;
                return { ...t, ...updatedTrack };
              }
              return t;
            });
            return plChanged ? { ...pl, tracks: updatedTracks } : pl;
          });

          // Check if there are still pending tracks across playlists to update syncStatus
          let totalCount = 0;
          let resolvedCount = 0;
          let hasPending = false;

          for (const pl of playlists) {
            if (pl.tracks && pl.tracks.some((t) => t.id.startsWith("pending:"))) {
              hasPending = true;
              totalCount += pl.tracks.length;
              resolvedCount += pl.tracks.filter(
                (t) => !t.id.startsWith("pending:")
              ).length;
            }
          }

          const syncStatus = hasPending
            ? { isSyncing: true, resolved: resolvedCount, total: totalCount }
            : null;

          return { playlists, syncStatus };
        });

        if (isSupabaseConfigured() && useAuthStore.getState().user) {
          try {
            const supabase = createClient();
            await supabase
              .from("playlist_tracks")
              .update({
                track_id: updatedTrack.id || oldId,
                thumbnail: updatedTrack.thumbnail,
                duration: updatedTrack.duration,
              })
              .eq("track_id", oldId);
          } catch (e) {
            console.warn("Failed to update track in Supabase:", e);
          }
        }
      },

      startBackgroundSync: () => {
        if (backgroundTimer) return;

        const tick = async () => {
          const playlists = get().playlists;
          const pendingList: Track[] = [];

          for (const pl of playlists) {
            if (pl.tracks) {
              for (const t of pl.tracks) {
                if (t.id.startsWith("pending:") && !inFlightIds.has(t.id)) {
                  pendingList.push(t);
                  if (pendingList.length >= 2) break;
                }
              }
            }
            if (pendingList.length >= 2) break;
          }

          if (pendingList.length === 0) {
            const hasAnyPending = playlists.some((pl) =>
              pl.tracks?.some((t) => t.id.startsWith("pending:"))
            );
            if (!hasAnyPending) {
              set({ syncStatus: null });
              if (backgroundTimer) {
                clearInterval(backgroundTimer);
                backgroundTimer = null;
              }
              inFlightIds.clear();
            }
            return;
          }

          // Process 2 tracks gently every 1.5s
          await Promise.all(
            pendingList.map(async (track) => {
              inFlightIds.add(track.id);
              try {
                const query = `${track.title} ${track.artist}`.trim();
                const res = await fetch(
                  `/api/search?q=${encodeURIComponent(query)}`
                );
                if (!res.ok) return;
                const data = await res.json();
                const top = data.tracks?.[0];
                if (top) {
                  const upd: Partial<Track> = {
                    id: top.id,
                    thumbnail: top.thumbnail,
                    duration: top.duration || track.duration,
                    durationFormatted:
                      top.durationFormatted || track.durationFormatted,
                  };
                  await get().resolveTrackInPlaylists(track.id, upd);
                  usePlayerStore.getState().resolveTrack(track.id, upd);
                }
              } catch (err) {
                console.warn("Background track resolution error:", err);
              } finally {
                inFlightIds.delete(track.id);
              }
            })
          );
        };

        backgroundTimer = setInterval(tick, 1500);
      },

      stopBackgroundSync: () => {
        if (backgroundTimer) {
          clearInterval(backgroundTimer);
          backgroundTimer = null;
        }
      },
    }),
    {
      name: "aether-playlists-storage",
      partialize: (state) => ({ playlists: state.playlists }),
    }
  )
);
