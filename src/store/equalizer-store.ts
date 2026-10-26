import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EqualizerBand {
  label: string;
  frequency: string;
  gain: number; // in dB (-12 to +12)
}

export interface EqualizerPreset {
  id: string;
  name: string;
  description: string;
  gains: [number, number, number, number, number];
}

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  {
    id: "flat",
    name: "Reference Flat",
    description: "Uncolored studio master response with neutral linearity",
    gains: [0, 0, 0, 0, 0],
  },
  {
    id: "warm-tube",
    name: "Warm Tube Vinyl",
    description: "Analog tube warmth with rich low-mids and smoothed high frequencies",
    gains: [3, 4, 1, -1, -2],
  },
  {
    id: "bass-punch",
    name: "Bass Punch",
    description: "Sub-woofer impact and low-end definition without mid clutter",
    gains: [7, 4, -1, 1, 2],
  },
  {
    id: "vocal-clarity",
    name: "Vocal Clarity",
    description: "Intimate acoustic presence, vocal prominence, and string detail",
    gains: [-2, 1, 4, 5, 2],
  },
  {
    id: "electronic",
    name: "Electronic Energy",
    description: "Dynamic V-curve for electronic kick punch and crystalline highs",
    gains: [6, 2, -2, 3, 5],
  },
  {
    id: "late-night",
    name: "Late Night Lounge",
    description: "Non-fatiguing compressed curve optimized for low-volume immersion",
    gains: [2, 1, -2, -3, -4],
  },
];

interface EqualizerState {
  isOpen: boolean;
  isEnabled: boolean;
  activePresetId: string;
  bands: [number, number, number, number, number]; // [60Hz, 250Hz, 1kHz, 4kHz, 12kHz]

  // Actions
  toggleEqualizer: () => void;
  setIsOpen: (open: boolean) => void;
  setIsEnabled: (enabled: boolean) => void;
  setBandGain: (index: number, gain: number) => void;
  applyPreset: (presetId: string) => void;
  resetToFlat: () => void;
}

export const useEqualizerStore = create<EqualizerState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isEnabled: true,
      activePresetId: "warm-tube",
      bands: [3, 4, 1, -1, -2],

      toggleEqualizer: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsOpen: (open) => set({ isOpen: open }),
      setIsEnabled: (enabled) => set({ isEnabled: enabled }),

      setBandGain: (index, gain) => {
        const clampedGain = Math.max(-12, Math.min(12, Math.round(gain * 10) / 10));
        const newBands = [...get().bands] as [number, number, number, number, number];
        newBands[index] = clampedGain;
        set({ bands: newBands, activePresetId: "custom" });
      },

      applyPreset: (presetId) => {
        const preset = EQUALIZER_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          set({
            activePresetId: preset.id,
            bands: [...preset.gains],
          });
        }
      },

      resetToFlat: () => {
        set({
          activePresetId: "flat",
          bands: [0, 0, 0, 0, 0],
        });
      },
    }),
    {
      name: "aether-equalizer-storage",
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        activePresetId: state.activePresetId,
        bands: state.bands,
      }),
    }
  )
);
