import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Track } from "@/types/music";

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
  addToQueue: (track: Track) => void;
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

      toggleLike: (track) =>
        set((state) => {
          const isLiked = state.likedTrackIds.includes(track.id);
          const likedTracks = isLiked
            ? state.likedTracks.filter((t) => t.id !== track.id)
            : [track, ...state.likedTracks];
          const likedTrackIds = likedTracks.map((t) => t.id);

          return {
            likedTracks,
            likedTrackIds,
          };
        }),

      toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),

      addToQueue: (track) =>
        set((state) => ({
          queue: [...state.queue, track],
        })),
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
