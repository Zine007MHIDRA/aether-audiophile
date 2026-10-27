"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Disc, Radio } from "lucide-react";

const BOOT_STAGES = [
  { progress: 25, label: "Initializing Acoustic Sanctuary Engine..." },
  { progress: 55, label: "Syncing Live Billboard Hot 100 Catalog..." },
  { progress: 85, label: "Calibrating Lossless 24-Bit / 96kHz Stream..." },
  { progress: 100, label: "Aether Hi-Fi Sanctuary Primed" },
];

export function AppIntroSplash() {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Listen for custom "aether-ready" event emitted when initial catalog finishes loading
    const handleReady = () => {
      setIsDataReady(true);
    };

    window.addEventListener("aether-ready", handleReady);

    // Staged progress ticker
    const timer1 = setTimeout(() => {
      setStageIndex(1);
      setProgress(45);
    }, 300);

    const timer2 = setTimeout(() => {
      setStageIndex(2);
      setProgress(75);
    }, 700);

    const timer3 = setTimeout(() => {
      setStageIndex(3);
      setProgress(100);
    }, 1100);

    // Safety fallback: if no event fires within 2.8s, force ready
    const fallbackTimer = setTimeout(() => {
      setIsDataReady(true);
    }, 2800);

    return () => {
      window.removeEventListener("aether-ready", handleReady);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Trigger smooth fade-out once minimum display duration (~1.1s) and data are both ready
  useEffect(() => {
    if (stageIndex >= 2 && isDataReady && !isExiting) {
      // Small graceful pause at 100%
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 350);

      // Unmount from DOM completely after fade-out transition finishes
      const unmountTimer = setTimeout(() => {
        setIsMounted(false);
      }, 1100);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [stageIndex, isDataReady, isExiting]);

  if (!isMounted) return null;

  const currentStage = BOOT_STAGES[stageIndex] || BOOT_STAGES[0];

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#060709] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-700 ease-out ${
        isExiting
          ? "opacity-0 scale-[1.03] blur-sm pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* Ambient Acoustic Radial Glows */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-aether-gold/15 via-[#996515]/10 to-transparent blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Center Soundwave Rings & Monogram */}
      <div className="relative flex flex-col items-center gap-7 z-10 max-w-sm w-full px-6 text-center">
        {/* Pulsing Concentric Soundwave Rings */}
        <div className="relative flex items-center justify-center w-28 h-28">
          <div className="absolute inset-0 rounded-full border border-aether-gold/25 animate-ping opacity-20" />
          <div className="absolute -inset-3 rounded-full border border-aether-gold/15 animate-[pulse_3s_ease-in-out_infinite]" />
          <div className="absolute -inset-7 rounded-full border border-aether-gold/10 animate-[pulse_4s_ease-in-out_infinite]" />

          {/* Golden Aether Emblem Disc */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#181A24] via-[#12141C] to-[#060709] border border-aether-gold/40 shadow-gold-glow flex items-center justify-center overflow-hidden p-1 group">
            <img
              src="/branding/aether-logo.jpg"
              alt="Aether"
              className="w-full h-full object-cover rounded-xl shadow-inner"
            />
            {/* Gloss reflection shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Brand Name & Hi-Fi Tagline */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-white text-2xl font-extrabold tracking-[0.35em] uppercase font-serif">
            AETHER
          </h1>
          <div className="flex items-center gap-2 text-aether-gold text-[10px] tracking-[0.25em] font-mono uppercase">
            <Sparkles className="w-3 h-3 text-aether-gold" />
            <span>Audiophile Hi-Fi Studio</span>
            <Sparkles className="w-3 h-3 text-aether-gold" />
          </div>
        </div>

        {/* Progress Bar & Audiophile Status Micro-Indicator */}
        <div className="flex flex-col items-center gap-3 w-full mt-2">
          {/* Laser Progress Track */}
          <div className="relative w-48 h-1 rounded-full bg-aether-highlight/60 overflow-hidden border border-white/5">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-aether-gold-muted via-aether-gold to-[#FFF8DC] transition-all duration-500 ease-out shadow-[0_0_10px_#E6C280]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Subtext Status */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-aether-subdued tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-ping" />
            <span className="truncate">{currentStage.label}</span>
          </div>
        </div>
      </div>

      {/* Subtle Footer Spec */}
      <div className="absolute bottom-8 flex items-center gap-3 text-[9px] font-mono text-aether-muted tracking-widest uppercase">
        <span>Lossless 24-Bit Audio</span>
        <span>•</span>
        <span>Zero Distortion Master</span>
        <span>•</span>
        <span>Sanctuary v1.0</span>
      </div>
    </div>
  );
}
