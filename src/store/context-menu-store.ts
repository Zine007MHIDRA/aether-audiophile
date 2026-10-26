import { create } from "zustand";
import { Track } from "@/types/music";

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  track: Track | null;
  tracksContext?: Track[];
  toastMessage: string | null;

  openContextMenu: (
    track: Track,
    position: { x: number; y: number },
    tracksContext?: Track[]
  ) => void;
  closeContextMenu: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

let toastTimer: NodeJS.Timeout | null = null;

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  track: null,
  tracksContext: undefined,
  toastMessage: null,

  openContextMenu: (track, position, tracksContext) =>
    set({
      isOpen: true,
      track,
      position,
      tracksContext,
    }),

  closeContextMenu: () => set({ isOpen: false }),

  showToast: (message: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: message });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null });
      toastTimer = null;
    }, 2500);
  },

  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: null });
  },
}));
