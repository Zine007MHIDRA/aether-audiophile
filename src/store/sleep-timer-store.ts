import { create } from "zustand";
import { usePlayerStore } from "./player-store";
import { useContextMenuStore } from "./context-menu-store";

interface SleepTimerState {
  isOpen: boolean;
  isActive: boolean;
  mode: "minutes" | "end_of_track" | null;
  durationMinutes: number | null;
  targetTimestamp: number | null; // epoch ms
  remainingSeconds: number;
  isFadingOut: boolean;
  initialVolumeRef: number;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  startMinutesTimer: (minutes: number) => void;
  startEndOfTrackTimer: () => void;
  addFiveMinutes: () => void;
  cancelTimer: () => void;
}

let timerInterval: NodeJS.Timeout | null = null;
let fadeInterval: NodeJS.Timeout | null = null;

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isOpen: false,
  isActive: false,
  mode: null,
  durationMinutes: null,
  targetTimestamp: null,
  remainingSeconds: 0,
  isFadingOut: false,
  initialVolumeRef: 0.8,

  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),

  startMinutesTimer: (minutes: number) => {
    // Clear any existing intervals
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    const targetMs = Date.now() + minutes * 60 * 1000;
    const initialSeconds = minutes * 60;
    const currentVol = usePlayerStore.getState().volume;

    set({
      isActive: true,
      mode: "minutes",
      durationMinutes: minutes,
      targetTimestamp: targetMs,
      remainingSeconds: initialSeconds,
      isFadingOut: false,
      initialVolumeRef: currentVol,
      isOpen: false,
    });

    useContextMenuStore.getState().showToast(`Sleep Timer set for ${minutes} min`);

    timerInterval = setInterval(() => {
      const state = get();
      if (!state.isActive || !state.targetTimestamp) {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      const diffSec = Math.max(0, Math.round((state.targetTimestamp - Date.now()) / 1000));
      set({ remainingSeconds: diffSec });

      // Start 10-second acoustic fade-out
      if (diffSec <= 10 && !state.isFadingOut) {
        executeFadeOut();
      }

      // Timer complete
      if (diffSec <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
      }
    }, 1000);
  },

  startEndOfTrackTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    const player = usePlayerStore.getState();
    const currentVol = player.volume;

    if (!player.currentTrack || player.duration <= 0) {
      useContextMenuStore.getState().showToast("Start playback to use End of Track timer");
      return;
    }

    const remainingTrackSec = Math.max(0, Math.round(player.duration - player.progress));

    set({
      isActive: true,
      mode: "end_of_track",
      durationMinutes: null,
      targetTimestamp: Date.now() + remainingTrackSec * 1000,
      remainingSeconds: remainingTrackSec,
      isFadingOut: false,
      initialVolumeRef: currentVol,
      isOpen: false,
    });

    useContextMenuStore.getState().showToast("Sleep Timer set for End of Track");

    timerInterval = setInterval(() => {
      const state = get();
      if (!state.isActive) {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      const playerNow = usePlayerStore.getState();
      if (!playerNow.currentTrack) {
        get().cancelTimer();
        return;
      }

      const remSec = Math.max(0, Math.round(playerNow.duration - playerNow.progress));
      set({ remainingSeconds: remSec });

      // 10s fade before track ends
      if (remSec <= 10 && !state.isFadingOut) {
        executeFadeOut();
      }

      if (remSec <= 0 || !playerNow.isPlaying) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
      }
    }, 1000);
  },

  addFiveMinutes: () => {
    const { targetTimestamp, remainingSeconds } = get();
    if (!targetTimestamp) return;

    const newTarget = targetTimestamp + 5 * 60 * 1000;
    set({
      targetTimestamp: newTarget,
      remainingSeconds: remainingSeconds + 300,
      isFadingOut: false,
    });

    // If we were fading out, restore original volume
    const initialVol = get().initialVolumeRef;
    usePlayerStore.getState().setVolume(initialVol);
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }

    useContextMenuStore.getState().showToast("+5 Minutes added to Sleep Timer");
  },

  cancelTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);
    timerInterval = null;
    fadeInterval = null;

    const initialVol = get().initialVolumeRef;
    usePlayerStore.getState().setVolume(initialVol);

    set({
      isActive: false,
      mode: null,
      durationMinutes: null,
      targetTimestamp: null,
      remainingSeconds: 0,
      isFadingOut: false,
    });

    useContextMenuStore.getState().showToast("Sleep Timer cancelled");
  },
}));

// Helper function to execute gradual volume attenuation over 10 seconds
function executeFadeOut() {
  const store = useSleepTimerStore.getState();
  if (store.isFadingOut) return;

  useSleepTimerStore.setState({ isFadingOut: true });

  const startVolume = usePlayerStore.getState().volume;
  const fadeDurationMs = 10000;
  const stepIntervalMs = 250;
  const totalSteps = fadeDurationMs / stepIntervalMs;
  let currentStep = 0;

  if (fadeInterval) clearInterval(fadeInterval);

  fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / totalSteps;
    const newVolume = Math.max(0, startVolume * (1 - progress));

    usePlayerStore.getState().setVolume(newVolume);

    if (currentStep >= totalSteps) {
      if (fadeInterval) clearInterval(fadeInterval);
      fadeInterval = null;

      // Pause playback
      usePlayerStore.getState().setIsPlaying(false);

      // Restore volume setting for future sessions
      usePlayerStore.getState().setVolume(store.initialVolumeRef);

      // Reset timer
      useSleepTimerStore.setState({
        isActive: false,
        mode: null,
        durationMinutes: null,
        targetTimestamp: null,
        remainingSeconds: 0,
        isFadingOut: false,
      });

      useContextMenuStore.getState().showToast("Playback paused by Sleep Timer");
    }
  }, stepIntervalMs);
}
