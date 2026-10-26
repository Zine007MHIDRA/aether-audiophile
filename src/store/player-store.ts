import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Track } from "@/types/music";
import { usePlaylistStore } from "./playlist-store";

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  duration: number;
  repeatMode: "off" | "all" | "one";
  isShuffle: boolean;
  likedTracks: Track[];
  likedTrackIds: string[];
  isLyricsOpen: boolean;
  isQueueOpen: boolean;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleLike: (track: Track) => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearUpcomingQueue: () => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  jumpToQueueIndex: (index: number) => void;
  resolveTrack: (oldId: string, updatedTrack: Partial<Track>) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      progress: 0,
      duration: 0,
      repeatMode: "off",
      isShuffle: false,
      likedTracks: [],
      likedTrackIds: [],
      isLyricsOpen: false,
      isQueueOpen: false,

      playTrack: (track, newQueue) => {
        let queue = newQueue ? [...newQueue] : [...get().queue];
        let index = queue.findIndex((t) => t.id === track.id);
        if (index === -1) {
          queue = [...queue, track];
          index = queue.length - 1;
        }

        set({
          currentTrack: track,
          queue,
          queueIndex: index,
          isPlaying: true,
          progress: 0,
          duration: track.duration || 0,
        });
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (playing) => set({ isPlaying: playing }),

      nextTrack: () => {
        const { queue, queueIndex, repeatMode, isShuffle } = get();
        if (queue.length === 0) return;

        if (repeatMode === "one") {
          set({ progress: 0, isPlaying: true });
          return;
        }

        let nextIndex = queueIndex + 1;
        if (isShuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
          if (repeatMode === "all") {
            nextIndex = 0;
          } else {
            set({ isPlaying: false });
            return;
          }
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack) {
          set({
            currentTrack: nextTrack,
            queueIndex: nextIndex,
            isPlaying: true,
            progress: 0,
            duration: nextTrack.duration || 0,
          });
        }
      },

      prevTrack: () => {
        const { queue, queueIndex, progress } = get();
        if (progress > 3) {
          set({ progress: 0 });
          return;
        }

        if (queueIndex > 0) {
          const prevIndex = queueIndex - 1;
          const prev = queue[prevIndex];
          set({
            currentTrack: prev,
            queueIndex: prevIndex,
            isPlaying: true,
            progress: 0,
            duration: prev.duration || 0,
          });
        }
      },

      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),

      setVolume: (volume) => set({ volume, isMuted: false }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      toggleRepeat: () =>
        set((state) => ({
          repeatMode:
            state.repeatMode === "off"
              ? "all"
              : state.repeatMode === "all"
              ? "one"
              : "off",
        })),

      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

      toggleLike: (track) => {
        const isCurrentlyLiked = get().likedTrackIds.includes(track.id);
        const willBeLiked = !isCurrentlyLiked;

        set((state) => {
          const likedTracks = willBeLiked
            ? [track, ...state.likedTracks.filter((t) => t.id !== track.id)]
            : state.likedTracks.filter((t) => t.id !== track.id);
          const likedTrackIds = likedTracks.map((t) => t.id);

          return {
            likedTracks,
            likedTrackIds,
          };
        });

        // Persist to Supabase if logged in
        usePlaylistStore.getState().persistVaultTrack(track, willBeLiked);
      },

      toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
      setIsQueueOpen: (open) => set({ isQueueOpen: open }),

      addToQueue: (track) => {
        const { queue } = get();
        if (queue.length === 0) {
          get().playTrack(track);
          return;
        }
        set((state) => ({
          queue: [...state.queue, track],
        }));
      },

      playNext: (track) => {
        const { queue, queueIndex } = get();
        if (queue.length === 0 || queueIndex === -1) {
          get().playTrack(track);
          return;
        }
        const newQueue = [...queue];
        newQueue.splice(queueIndex + 1, 0, track);
        set({ queue: newQueue });
      },

      removeFromQueue: (index) => {
        const { queue, queueIndex } = get();
        if (index < 0 || index >= queue.length) return;
        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;
        if (index < queueIndex) {
          newIndex = queueIndex - 1;
        } else if (index === queueIndex) {
          if (newQueue.length === 0) {
            set({ currentTrack: null, queue: [], queueIndex: -1, isPlaying: false });
            return;
          }
          const nextTrack = newQueue[Math.min(queueIndex, newQueue.length - 1)];
          set({
            currentTrack: nextTrack,
            queue: newQueue,
            queueIndex: Math.min(queueIndex, newQueue.length - 1),
            progress: 0,
            duration: nextTrack.duration || 0,
          });
          return;
        }
        set({ queue: newQueue, queueIndex: newIndex });
      },

      clearUpcomingQueue: () => {
        const { queue, queueIndex, currentTrack } = get();
        if (!currentTrack || queueIndex === -1) {
          set({ queue: [], queueIndex: -1 });
          return;
        }
        const newQueue = queue.slice(0, queueIndex + 1);
        set({ queue: newQueue });
      },

      moveQueueItem: (fromIndex, toIndex) => {
        const { queue, queueIndex } = get();
        if (
          fromIndex < 0 ||
          fromIndex >= queue.length ||
          toIndex < 0 ||
          toIndex >= queue.length ||
          fromIndex === toIndex
        ) {
          return;
        }
        const newQueue = [...queue];
        const [movedTrack] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedTrack);

        let newQueueIndex = queueIndex;
        if (queueIndex === fromIndex) {
          newQueueIndex = toIndex;
        } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
          newQueueIndex = queueIndex - 1;
        } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
          newQueueIndex = queueIndex + 1;
        }

        set({ queue: newQueue, queueIndex: newQueueIndex });
      },

      jumpToQueueIndex: (index) => {
        const { queue } = get();
        if (index >= 0 && index < queue.length) {
          const track = queue[index];
          set({
            currentTrack: track,
            queueIndex: index,
            isPlaying: true,
            progress: 0,
            duration: track.duration || 0,
          });
        }
      },

      resolveTrack: (oldId, updatedTrack) => {
        set((state) => {
          const currentTrack =
            state.currentTrack?.id === oldId
              ? { ...state.currentTrack, ...updatedTrack }
              : state.currentTrack;

          const queue = state.queue.map((t) =>
            t.id === oldId ? { ...t, ...updatedTrack } : t
          );

          const likedTracks = state.likedTracks.map((t) =>
            t.id === oldId ? { ...t, ...updatedTrack } : t
          );
          const likedTrackIds = likedTracks.map((t) => t.id);

          return {
            currentTrack,
            queue,
            likedTracks,
            likedTrackIds,
          };
        });
      },
    }),
    {
      name: "aether-player-storage",
      partialize: (state) => ({
        volume: state.volume,
        likedTracks: state.likedTracks,
        likedTrackIds: state.likedTrackIds,
        repeatMode: state.repeatMode,
        isShuffle: state.isShuffle,
      }),
    }
  )
);
