"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, ShieldCheck, Sparkles, SlidersHorizontal } from "lucide-react";

interface HarmonicSliderProps {
  onVerified: (verified: boolean) => void;
  isVerified?: boolean;
  onReset?: () => void;
}

export function HarmonicSlider({
  onVerified,
  isVerified = false,
  onReset,
}: HarmonicSliderProps) {
  const [progress, setProgress] = useState(isVerified ? 100 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [verifiedState, setVerifiedState] = useState(isVerified);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sync external isVerified changes
  useEffect(() => {
    setVerifiedState(isVerified);
    setProgress(isVerified ? 100 : 0);
  }, [isVerified]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (verifiedState) return;
    setIsDragging(true);
    updateProgress(e.clientX);
  };

  const updateProgress = useCallback(
    (clientX: number) => {
      if (!trackRef.current || verifiedState) return;
      const rect = trackRef.current.getBoundingClientRect();
      const thumbWidth = 44; // width of thumb button
      const availableWidth = rect.width - thumbWidth;
      const offsetX = clientX - rect.left - thumbWidth / 2;
      const clampedOffset = Math.max(0, Math.min(offsetX, availableWidth));
      const percentage = Math.round((clampedOffset / availableWidth) * 100);

      if (percentage >= 90) {
        setProgress(100);
        setVerifiedState(true);
        setIsDragging(false);
        onVerified(true);
      } else {
        setProgress(percentage);
      }
    },
    [verifiedState, onVerified]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      updateProgress(e.clientX);
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      // If user released before reaching 90%, spring back to 0
      setProgress((prev) => {
        if (prev < 90) {
          return 0;
        }
        return 100;
      });
    };

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, updateProgress]);

  const handleReset = () => {
    setProgress(0);
    setVerifiedState(false);
    setIsDragging(false);
    onVerified(false);
    onReset?.();
  };

  return (
    <div className="flex flex-col gap-1.5 w-full select-none">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-aether-muted px-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-aether-gold" />
          Harmonic Human Authentication
        </span>
        {verifiedState && (
          <button
            type="button"
            onClick={handleReset}
            className="text-aether-subdued hover:text-white transition text-[9px] underline"
          >
            Reset
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={`relative h-12 w-full rounded-xl overflow-hidden cursor-pointer transition-colors duration-200 border ${
          verifiedState
            ? "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            : isDragging
            ? "bg-[#0b0c10] border-aether-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
            : "bg-[#07080b] border-aether-border/60 hover:border-aether-gold/30"
        }`}
      >
        {/* Dynamic Glow Fill */}
        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-75 ${
            verifiedState
              ? "bg-gradient-to-r from-emerald-500/30 to-emerald-400/10"
              : "bg-gradient-to-r from-aether-gold/30 via-aether-gold/15 to-transparent"
          }`}
          style={{ width: `${progress}%` }}
        />

        {/* Shimmering Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          {verifiedState ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono tracking-wider animate-fadeIn">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Resonance Locked · Human Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-aether-subdued tracking-wider">
              {isDragging ? (
                <span className="text-aether-gold font-medium">
                  Tuning resonance... {progress}%
                </span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-aether-gold/70 animate-pulse" />
                  <span className="bg-gradient-to-r from-white via-aether-muted to-white bg-clip-text text-transparent">
                    Slide to tune harmonic access
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Draggable Thumb Knob */}
        <div
          className={`absolute top-1 bottom-1 w-11 rounded-lg flex items-center justify-center transition-all ${
            isDragging ? "duration-0 scale-105" : "duration-200"
          } ${
            verifiedState
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "bg-gradient-to-br from-[#F3E5AB] via-[#D4AF37] to-[#996515] text-[#060709] shadow-[0_0_12px_rgba(212,175,55,0.4)]"
          }`}
          style={{
            left: `calc(${progress}% * (100% - 44px) / 100 + 4px)`,
          }}
        >
          {verifiedState ? (
            <Check className="w-5 h-5 stroke-[2.5]" />
          ) : isDragging ? (
            <SlidersHorizontal className="w-4 h-4 animate-spin-slow" />
          ) : (
            <SlidersHorizontal className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}
