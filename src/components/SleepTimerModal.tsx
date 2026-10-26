"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Moon,
  Timer,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Volume2,
  Disc,
} from "lucide-react";
import { useSleepTimerStore } from "@/store/sleep-timer-store";
import { usePlayerStore } from "@/store/player-store";

function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return "00:00";
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const PRESET_MINUTES = [15, 30, 45, 60];

export function SleepTimerModal() {
  const {
    isOpen,
    isActive,
    mode,
    durationMinutes,
    remainingSeconds,
    isFadingOut,
    closeModal,
    startMinutesTimer,
    startEndOfTrackTimer,
    addFiveMinutes,
    cancelTimer,
  } = useSleepTimerStore();

  const { currentTrack, duration, progress } = usePlayerStore();
  const [customMinutes, setCustomMinutes] = useState(25);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const trackRemainingSec =
    currentTrack && duration > 0 ? Math.max(0, Math.round(duration - progress)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(212,175,55,0.25)] p-6 select-none animate-in zoom-in-95 duration-200 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Sleep Timer
                </h2>
                {isActive && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold border bg-[#D4AF37]/20 text-[#F3E5AB] border-[#D4AF37]/50 animate-pulse">
                    {isFadingOut ? "FADING OUT" : "COUNTDOWN"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Gentle 10-Second Acoustic Attenuation
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State A: Running Timer Display */}
        {isActive ? (
          <div className="flex flex-col items-center gap-4 py-3">
            {/* Countdown Clock Face */}
            <div className="relative w-44 h-44 rounded-full border border-white/10 flex flex-col items-center justify-center bg-black/40 shadow-inner">
              <div
                className={`absolute inset-0 rounded-full border-2 border-[#D4AF37] ${
                  isFadingOut
                    ? "animate-ping opacity-30"
                    : "shadow-[0_0_20px_rgba(212,175,55,0.25)]"
                }`}
              />

              <Timer className="w-6 h-6 text-[#D4AF37] mb-1" />
              <span className="text-3xl font-bold font-mono text-white tracking-tight tabular-nums">
                {formatCountdown(remainingSeconds)}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
                {isFadingOut
                  ? "Fading volume out..."
                  : mode === "end_of_track"
                  ? "End of track"
                  : `${durationMinutes} min timer`}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={addFiveMinutes}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Add 5 Min</span>
              </button>

              <button
                onClick={cancelTimer}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel Timer</span>
              </button>
            </div>
          </div>
        ) : (
          /* State B: Inactive / Setup Mode */
          <div className="flex flex-col gap-4">
            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  onClick={() => startMinutesTimer(mins)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-[#D4AF37]/15 border border-white/5 hover:border-[#D4AF37]/40 text-left transition group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-[#F3E5AB]">
                      {mins} Minutes
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Standard Session
                    </span>
                  </div>
                  <Clock className="w-4 h-4 text-zinc-500 group-hover:text-[#D4AF37] transition" />
                </button>
              ))}
            </div>

            {/* End of Current Track Option */}
            {currentTrack && (
              <button
                onClick={startEndOfTrackTimer}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent border border-[#D4AF37]/35 hover:border-[#D4AF37]/60 text-left transition group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Disc className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      End of Current Track
                    </span>
                    <span className="text-[10px] text-[#F3E5AB] truncate mt-0.5">
                      {currentTrack.title} ({formatCountdown(trackRemainingSec)}{" "}
                      left)
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#D4AF37] font-semibold uppercase shrink-0">
                  Select
                </span>
              </button>
            )}

            {/* Custom Minutes Slider */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Custom Time</span>
                <span className="text-white font-mono font-bold text-sm text-[#F3E5AB]">
                  {customMinutes} min
                </span>
              </div>

              <div className="relative flex items-center w-full h-1.5 bg-zinc-800 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-[#C5A059] to-[#F3E5AB] rounded-full pointer-events-none"
                  style={{
                    width: `${((customMinutes - 5) / (120 - 5)) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <button
                onClick={() => startMinutesTimer(customMinutes)}
                className="mt-1 w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F3E5AB] text-black font-semibold text-xs tracking-wider uppercase transition shadow-md"
              >
                Start {customMinutes} Min Timer
              </button>
            </div>
          </div>
        )}

        {/* Acoustic Protection Note */}
        <div className="pt-3 border-t border-white/10 flex items-start gap-2.5 text-[10px] text-zinc-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
          <span>
            Aether automatically attenuates playback over 10 seconds before
            pausing to eliminate abrupt audio cuts and prevent acoustic shock.
          </span>
        </div>
      </div>
    </div>
  );
}
