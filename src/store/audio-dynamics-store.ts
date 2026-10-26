import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useContextMenuStore } from "./context-menu-store";

export type LUFSPreset = -16 | -14 | -11;

export interface LUFSOption {
  value: LUFSPreset;
  title: string;
  tag: string;
  description: string;
}

export const LUFS_PRESETS: LUFSOption[] = [
  {
    value: -16,
    title: "Audiophile Reference",
    tag: "-16 LUFS",
    description: "Preserves natural acoustic dynamics, micro-details, and expansive crest factor.",
  },
  {
    value: -14,
    title: "Balanced Standard",
    tag: "-14 LUFS",
    description: "AES TD1004 / EBU R128 standard. Consistent loudness across varied productions.",
  },
  {
    value: -11,
    title: "High Energy",
    tag: "-11 LUFS",
    description: "Elevated perceptual loudness optimized for mobile listening and noisy environments.",
  },
];

interface AudioDynamicsState {
  isOpen: boolean;

  // Crossfade parameters
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // 1 to 12 seconds
  manualSkipFade: boolean; // 500ms fade on manual user skip
  isCrossfading: boolean;

  // Loudness Normalization parameters
  loudnessNormalizationEnabled: boolean;
  targetLUFS: LUFSPreset;
  preampHeadroom: number; // -2.0, -1.0, -0.5 dB
  currentAppliedTrimDb: number; // For live UI display

  // Actions
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setCrossfadeEnabled: (enabled: boolean) => void;
  setCrossfadeDuration: (seconds: number) => void;
  setManualSkipFade: (enabled: boolean) => void;
  setIsCrossfading: (active: boolean) => void;
  setLoudnessNormalizationEnabled: (enabled: boolean) => void;
  setTargetLUFS: (lufs: LUFSPreset) => void;
  setPreampHeadroom: (db: number) => void;
  setCurrentAppliedTrimDb: (db: number) => void;
  resetToDefaults: () => void;
}

export const useAudioDynamicsStore = create<AudioDynamicsState>()(
  persist(
    (set) => ({
      isOpen: false,

      // Crossfade defaults
      crossfadeEnabled: true,
      crossfadeDuration: 4,
      manualSkipFade: true,
      isCrossfading: false,

      // Normalization defaults
      loudnessNormalizationEnabled: true,
      targetLUFS: -14,
      preampHeadroom: -1.0,
      currentAppliedTrimDb: 0,

      openModal: () => set({ isOpen: true }),
      closeModal: () => set({ isOpen: false }),
      toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),

      setCrossfadeEnabled: (crossfadeEnabled) => {
        set({ crossfadeEnabled });
        useContextMenuStore
          .getState()
          .showToast(crossfadeEnabled ? "Crossfade enabled" : "Crossfade disabled");
      },

      setCrossfadeDuration: (crossfadeDuration) => {
        const clamped = Math.max(1, Math.min(12, Math.round(crossfadeDuration)));
        set({ crossfadeDuration: clamped });
      },

      setManualSkipFade: (manualSkipFade) => set({ manualSkipFade }),

      setIsCrossfading: (isCrossfading) => set({ isCrossfading }),

      setLoudnessNormalizationEnabled: (loudnessNormalizationEnabled) => {
        set({ loudnessNormalizationEnabled });
        useContextMenuStore
          .getState()
          .showToast(
            loudnessNormalizationEnabled
              ? "Loudness Normalization enabled"
              : "Loudness Normalization disabled"
          );
      },

      setTargetLUFS: (targetLUFS) => {
        set({ targetLUFS });
        useContextMenuStore
          .getState()
          .showToast(`Target set to ${targetLUFS} LUFS`);
      },

      setPreampHeadroom: (preampHeadroom) => set({ preampHeadroom }),

      setCurrentAppliedTrimDb: (currentAppliedTrimDb) =>
        set({ currentAppliedTrimDb }),

      resetToDefaults: () => {
        set({
          crossfadeEnabled: true,
          crossfadeDuration: 4,
          manualSkipFade: true,
          loudnessNormalizationEnabled: true,
          targetLUFS: -14,
          preampHeadroom: -1.0,
          currentAppliedTrimDb: 0,
        });
        useContextMenuStore
          .getState()
          .showToast("Audio Dynamics reset to Audiophile Reference");
      },
    }),
    {
      name: "aether-audio-dynamics",
      partialize: (state) => ({
        crossfadeEnabled: state.crossfadeEnabled,
        crossfadeDuration: state.crossfadeDuration,
        manualSkipFade: state.manualSkipFade,
        loudnessNormalizationEnabled: state.loudnessNormalizationEnabled,
        targetLUFS: state.targetLUFS,
        preampHeadroom: state.preampHeadroom,
      }),
    }
  )
);
