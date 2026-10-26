"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Sparkles,
  Power,
  Volume2,
  Check,
} from "lucide-react";
import {
  useEqualizerStore,
  EQUALIZER_PRESETS,
} from "@/store/equalizer-store";
import { usePlayerStore } from "@/store/player-store";

const BAND_FREQUENCIES = [
  { label: "Sub-Bass", freq: "60 Hz", min: -12, max: 12 },
  { label: "Bass & Warmth", freq: "250 Hz", min: -12, max: 12 },
  { label: "Midrange", freq: "1 kHz", min: -12, max: 12 },
  { label: "Presence", freq: "4 kHz", min: -12, max: 12 },
  { label: "Air & Sparkle", freq: "12 kHz", min: -12, max: 12 },
];

export function AudioEqualizerModal() {
  const {
    isOpen,
    isEnabled,
    activePresetId,
    bands,
    toggleEqualizer,
    setIsOpen,
    setIsEnabled,
    setBandGain,
    applyPreset,
    resetToFlat,
  } = useEqualizerStore();

  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Spline Curve Visualizer on Canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const dbRange = 24; // -12 to +12 dB
      const pixelsPerDb = (height * 0.75) / dbRange;

      // Draw Grid Lines (-12dB, -6dB, 0dB, +6dB, +12dB)
      const gridLevels = [-12, -6, 0, 6, 12];
      gridLevels.forEach((db) => {
        const y = centerY - db * pixelsPerDb;
        ctx.beginPath();
        ctx.strokeStyle = db === 0 ? "rgba(212, 175, 55, 0.35)" : "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = db === 0 ? 1.5 : 1;
        if (db !== 0) ctx.setLineDash([3, 4]);
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label dB
        ctx.fillStyle = db === 0 ? "rgba(212, 175, 55, 0.7)" : "rgba(255, 255, 255, 0.25)";
        ctx.font = "9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${db > 0 ? "+" : ""}${db}dB`, 18, y + 3);
      });

      // Calculate the 5 band control points
      const paddingX = 40;
      const usableW = width - paddingX * 2;
      const points: { x: number; y: number }[] = [];

      // Edge start anchor
      const firstGain = isEnabled ? bands[0] : 0;
      points.push({ x: 0, y: centerY - firstGain * pixelsPerDb });

      bands.forEach((gain, index) => {
        const effectiveGain = isEnabled ? gain : 0;
        const x = paddingX + (index / (bands.length - 1)) * usableW;
        const y = centerY - effectiveGain * pixelsPerDb;
        points.push({ x, y });
      });

      // Edge end anchor
      const lastGain = isEnabled ? bands[bands.length - 1] : 0;
      points.push({ x: width, y: centerY - lastGain * pixelsPerDb });

      // Subtle live oscillation when playing
      if (isPlaying && isEnabled) {
        phase += 0.06;
      }

      // Draw Spline Curve via Catmull-Rom or Cardinal Spline
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }

      // Fill underneath curve
      ctx.save();
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
      fillGrad.addColorStop(0, isEnabled ? "rgba(212, 175, 55, 0.25)" : "rgba(255, 255, 255, 0.04)");
      fillGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.restore();

      // Stroke curve line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.strokeStyle = isEnabled ? "#F3E5AB" : "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isEnabled ? "#D4AF37" : "transparent";
      ctx.shadowBlur = isEnabled ? 10 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Key Control Points (Dots on the 5 bands)
      bands.forEach((gain, index) => {
        const effectiveGain = isEnabled ? gain : 0;
        const x = paddingX + (index / (bands.length - 1)) * usableW;
        const y = centerY - effectiveGain * pixelsPerDb;

        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isEnabled ? "#F3E5AB" : "#666";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = isEnabled ? "#D4AF37" : "#444";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isEnabled, bands, isPlaying]);

  if (!isOpen) return null;

  const currentPreset = EQUALIZER_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(212,175,55,0.25)] p-6 select-none animate-in zoom-in-95 duration-200 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Acoustic DSP Equalizer
                </h2>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                    isEnabled
                      ? "bg-[#D4AF37]/20 text-[#F3E5AB] border-[#D4AF37]/50"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  {isEnabled ? "ACTIVE" : "BYPASSED"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                5-Band Master Filter with Bezier Spline Frequency Modeling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DSP Master Power Button */}
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isEnabled
                  ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#F3E5AB] shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                  : "bg-zinc-900 border-white/10 text-zinc-500 hover:text-white"
              }`}
              title={isEnabled ? "Bypass Equalizer" : "Enable Equalizer"}
            >
              <Power className="w-4 h-4" />
            </button>

            {/* Close Modal */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Close Equalizer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 1: Dynamic Canvas Spline Curve */}
        <div className="relative w-full h-32 rounded-2xl bg-black/60 border border-white/10 overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>

        {/* Section 2: Preset Selector Tray */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
              Acoustic Tuning Presets
            </span>
            <span className="text-[10px] text-[#F3E5AB] font-mono truncate max-w-xs text-right">
              {currentPreset?.description || "Custom curve adjusted"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {EQUALIZER_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#D4AF37] text-black font-semibold shadow-md"
                      : "bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: 5 Precision Gain Vertical Sliders */}
        <div className="grid grid-cols-5 gap-3 pt-2">
          {BAND_FREQUENCIES.map((band, idx) => {
            const gain = bands[idx];

            return (
              <div
                key={band.freq}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition group"
              >
                {/* dB Gain Readout */}
                <span
                  className={`text-[11px] font-mono font-bold tabular-nums transition ${
                    gain > 0
                      ? "text-[#F3E5AB]"
                      : gain < 0
                      ? "text-zinc-400"
                      : "text-zinc-500"
                  }`}
                >
                  {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                  <span className="text-[9px] font-normal text-zinc-500 ml-0.5">
                    dB
                  </span>
                </span>

                {/* Vertical Range Slider Track */}
                <div className="relative h-32 w-7 flex items-center justify-center my-1">
                  {/* Zero dB Center Baseline Reference Tick */}
                  <div className="absolute top-1/2 left-0 w-full h-px bg-white/20 pointer-events-none" />

                  {/* Native Vertical Slider Overlay */}
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    onChange={(e) =>
                      setBandGain(idx, parseFloat(e.target.value))
                    }
                    disabled={!isEnabled}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />

                  {/* Custom Visual Track */}
                  <div className="w-1.5 h-full rounded-full bg-zinc-800 relative overflow-hidden pointer-events-none">
                    {/* Fill Bar from Center (0dB) */}
                    {gain >= 0 ? (
                      <div
                        className="absolute bottom-1/2 w-full bg-gradient-to-t from-[#C5A059] to-[#F3E5AB] rounded-full"
                        style={{ height: `${(gain / 12) * 50}%` }}
                      />
                    ) : (
                      <div
                        className="absolute top-1/2 w-full bg-gradient-to-b from-[#C5A059] to-zinc-600 rounded-full"
                        style={{ height: `${(Math.abs(gain) / 12) * 50}%` }}
                      />
                    )}
                  </div>

                  {/* Glowing Thumb Handle */}
                  <div
                    className="absolute w-4 h-4 rounded-full bg-[#F3E5AB] border-2 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.7)] pointer-events-none transition-transform group-hover:scale-110"
                    style={{
                      bottom: `calc(${((gain + 12) / 24) * 100}% - 8px)`,
                    }}
                  />
                </div>

                {/* Frequency & Band Label */}
                <div className="flex flex-col items-center text-center mt-1">
                  <span className="text-[11px] font-bold text-white font-mono tracking-tight">
                    {band.freq}
                  </span>
                  <span className="text-[9px] text-zinc-500 truncate mt-0.5">
                    {band.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <button
            onClick={resetToFlat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Flat</span>
          </button>

          <span className="text-[10px] text-zinc-500 tracking-wider uppercase">
            32-Bit Float Dynamic Range
          </span>
        </div>
      </div>
    </div>
  );
}
