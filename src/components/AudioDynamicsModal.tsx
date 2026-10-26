"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Sparkles,
  Volume2,
  Waves,
  ShieldCheck,
  Zap,
  Info,
  Check,
} from "lucide-react";
import {
  useAudioDynamicsStore,
  LUFS_PRESETS,
  LUFSPreset,
} from "@/store/audio-dynamics-store";
import { usePlayerStore } from "@/store/player-store";

export function AudioDynamicsModal() {
  const {
    isOpen,
    crossfadeEnabled,
    crossfadeDuration,
    manualSkipFade,
    isCrossfading,
    loudnessNormalizationEnabled,
    targetLUFS,
    preampHeadroom,
    currentAppliedTrimDb,
    closeModal,
    setCrossfadeEnabled,
    setCrossfadeDuration,
    setManualSkipFade,
    setLoudnessNormalizationEnabled,
    setTargetLUFS,
    setPreampHeadroom,
    resetToDefaults,
  } = useAudioDynamicsStore();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const crossfadePresets = [2, 4, 6, 8, 12];
  const headroomOptions = [
    { label: "-0.5 dB", value: -0.5 },
    { label: "-1.0 dB (AES)", value: -1.0 },
    { label: "-2.0 dB (Purist)", value: -2.0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(212,175,55,0.2)] p-6 select-none animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Audio Engine Dynamics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40 font-bold uppercase tracking-wider">
                  DSP Stage
                </span>
                {isCrossfading && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse font-semibold">
                    Crossfading
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Precision track blending & studio-grade LUFS dynamic leveling
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="py-4 space-y-6 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
          {/* SECTION 1: SEAMLESS CROSSFADE */}
          <div className="rounded-xl p-4 bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-[#D4AF37]">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    Acoustic Crossfade
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Gradual volume blend between ending and incoming tracks
                  </p>
                </div>
              </div>

              {/* Master Crossfade Toggle */}
              <button
                onClick={() => setCrossfadeEnabled(!crossfadeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  crossfadeEnabled
                    ? "bg-[#D4AF37]"
                    : "bg-zinc-800 border border-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                    crossfadeEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {crossfadeEnabled && (
              <div className="space-y-3.5 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                {/* Visualizer Curve */}
                <div className="h-14 rounded-lg bg-black/40 border border-white/5 p-2 relative flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 300 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="fadeA" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="fadeB" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#F3E5AB" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#F3E5AB" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    {/* Outgoing curve */}
                    <path
                      d="M 10 8 C 120 8, 170 36, 290 36"
                      fill="none"
                      stroke="url(#fadeA)"
                      strokeWidth="2.5"
                    />
                    {/* Incoming curve */}
                    <path
                      d="M 10 36 C 130 36, 180 8, 290 8"
                      fill="none"
                      stroke="url(#fadeB)"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="absolute inset-x-3 bottom-1.5 flex justify-between text-[9px] font-mono text-zinc-500">
                    <span>Track A (Fade Out)</span>
                    <span className="text-[#D4AF37] font-semibold">{crossfadeDuration}s Blend</span>
                    <span>Track B (Fade In)</span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {crossfadePresets.map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setCrossfadeDuration(sec)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                          crossfadeDuration === sec
                            ? "bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3E5AB] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                            : "bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-400">Duration Range</span>
                    <span className="text-[#F3E5AB] font-bold">{crossfadeDuration} Seconds</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    className="w-full accent-[#D4AF37] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                    <span>1s (Snappy)</span>
                    <span>4s (Recommended)</span>
                    <span>12s (Atmospheric)</span>
                  </div>
                </div>

                {/* Manual Skip Micro-Fade Checkbox */}
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={manualSkipFade}
                    onChange={(e) => setManualSkipFade(e.target.checked)}
                    className="rounded border-white/20 bg-zinc-900 text-[#D4AF37] focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-zinc-300">
                    Smooth 500ms transition on manual skip (eliminates abrupt audio tears)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* SECTION 2: SMART LOUDNESS NORMALIZATION */}
          <div className="rounded-xl p-4 bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-[#D4AF37]">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    Smart Loudness Normalization
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    ReplayGain dynamic leveling prevents sudden volume spikes
                  </p>
                </div>
              </div>

              {/* Master Normalization Toggle */}
              <button
                onClick={() =>
                  setLoudnessNormalizationEnabled(!loudnessNormalizationEnabled)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  loudnessNormalizationEnabled
                    ? "bg-[#D4AF37]"
                    : "bg-zinc-800 border border-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-zinc-950 transition-transform ${
                    loudnessNormalizationEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {loudnessNormalizationEnabled && (
              <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                {/* Target LUFS Radio Cards */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Target Integrated Loudness:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {LUFS_PRESETS.map((preset) => {
                      const isSelected = targetLUFS === preset.value;
                      return (
                        <div
                          key={preset.value}
                          onClick={() => setTargetLUFS(preset.value)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#D4AF37]/15 border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                              : "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-[#D4AF37] text-black"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {preset.tag}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                            </div>
                            <h4
                              className={`text-xs font-semibold ${
                                isSelected ? "text-white" : "text-zinc-300"
                              }`}
                            >
                              {preset.title}
                            </h4>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preamp Headroom Protection */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      True Peak Anti-Clipping Headroom
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Guards against DAC inter-sample overs and distortion
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {headroomOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPreampHeadroom(opt.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                          preampHeadroom === opt.value
                            ? "bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3E5AB] font-semibold"
                            : "bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-Time Live Leveling Status Pill */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <span className="text-[11px] font-semibold text-white block">
                        Live Stream DSP Trim
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {currentTrack ? `Track: ${currentTrack.title}` : "Ready for playback"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#F3E5AB]">
                      {currentAppliedTrimDb >= 0 ? `+${currentAppliedTrimDb.toFixed(1)} dB` : `${currentAppliedTrimDb.toFixed(1)} dB`}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 block">
                      Target {targetLUFS} LUFS
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            onClick={closeModal}
            className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C280] text-black font-semibold text-xs transition shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
