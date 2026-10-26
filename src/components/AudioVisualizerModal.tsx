"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Mic2,
  Sparkles,
  Activity,
  Waves,
  Disc,
  Radio,
} from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function AudioVisualizerModal() {
  const {
    currentTrack,
    isPlaying,
    isVisualizerOpen,
    visualizerMode,
    progress,
    duration,
    volume,
    isMuted,
    toggleVisualizer,
    setVisualizerMode,
    togglePlay,
    nextTrack,
    prevTrack,
    setProgress,
    toggleLyrics,
    isLyricsOpen,
  } = usePlayerStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Peak hold data for spectrum bars mode
  const peaksRef = useRef<number[]>([]);
  const valuesRef = useRef<number[]>([]);

  // Close on Escape key
  useEffect(() => {
    if (!isVisualizerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          toggleVisualizer();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisualizerOpen, toggleVisualizer]);

  // Auto-hide controls after inactivity
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3500);
  };

  // Toggle true browser fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Canvas render animation loop
  useEffect(() => {
    if (!isVisualizerOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth * window.devicePixelRatio);
    let height = (canvas.height = window.innerHeight * window.devicePixelRatio);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth * window.devicePixelRatio;
      height = canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    window.addEventListener("resize", handleResize);

    const numBars = 54;
    if (peaksRef.current.length !== numBars) {
      peaksRef.current = new Array(numBars).fill(0);
      valuesRef.current = new Array(numBars).fill(0);
    }

    let phase = 0;

    const render = () => {
      const renderW = window.innerWidth;
      const renderH = window.innerHeight;

      // Clear with deep obsidian vignette
      ctx.clearRect(0, 0, renderW, renderH);

      const effectiveVol = isMuted ? 0 : volume;
      const energyMultiplier = isPlaying ? effectiveVol * 1.15 : 0.08;

      phase += isPlaying ? 0.045 : 0.008;

      if (visualizerMode === "bars") {
        // --- 1. HI-FI SPECTRUM BARS (McIntosh / B&O Inspired) ---
        const totalBarWidth = renderW * 0.72;
        const barSpacing = 4;
        const barWidth = Math.max(
          3,
          (totalBarWidth - (numBars - 1) * barSpacing) / numBars
        );
        const startX = (renderW - totalBarWidth) / 2;
        const maxBarH = renderH * 0.38;
        const baselineY = renderH * 0.74;

        for (let i = 0; i < numBars; i++) {
          // Harmonic wave simulation with bass weighting
          const normalizedI = i / numBars;
          const bassWeight = Math.pow(1 - normalizedI, 1.4) * 1.4 + 0.3;

          const wave1 = Math.sin(phase * 2.2 + i * 0.28);
          const wave2 = Math.cos(phase * 1.4 + i * 0.45);
          const wave3 = Math.sin(phase * 3.8 + i * 0.15);

          const rawIntensity =
            Math.max(0, (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2 + 0.7) / 1.7) *
            bassWeight;

          const targetH = Math.min(
            maxBarH,
            Math.max(6, rawIntensity * maxBarH * energyMultiplier)
          );

          // Smooth interpolation towards target
          valuesRef.current[i] += (targetH - valuesRef.current[i]) * 0.22;
          const currentH = valuesRef.current[i];

          // Peak hold physics with gravity decay
          if (currentH > peaksRef.current[i]) {
            peaksRef.current[i] = currentH;
          } else {
            peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.25);
          }

          const x = startX + i * (barWidth + barSpacing);
          const y = baselineY - currentH;

          // Main vertical bar gradient (Obsidian Bronze -> Champagne Gold -> Radiant White)
          const barGrad = ctx.createLinearGradient(x, baselineY, x, y);
          barGrad.addColorStop(0, "rgba(197, 160, 89, 0.1)");
          barGrad.addColorStop(0.4, "rgba(212, 175, 55, 0.75)");
          barGrad.addColorStop(1, "rgba(255, 248, 220, 0.95)");

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, currentH, [2, 2, 0, 0]);
          ctx.fill();

          // Peak-hold floating cap dot
          const peakY = baselineY - peaksRef.current[i] - 3;
          ctx.fillStyle = "rgba(243, 229, 171, 0.9)";
          ctx.shadowColor = "#D4AF37";
          ctx.shadowBlur = 8;
          ctx.fillRect(x, Math.max(0, peakY), barWidth, 2);
          ctx.shadowBlur = 0;

          // Subdued mirror reflection below baseline
          const reflectionH = currentH * 0.22;
          const reflGrad = ctx.createLinearGradient(
            x,
            baselineY,
            x,
            baselineY + reflectionH
          );
          reflGrad.addColorStop(0, "rgba(212, 175, 55, 0.25)");
          reflGrad.addColorStop(1, "rgba(212, 175, 55, 0)");

          ctx.fillStyle = reflGrad;
          ctx.fillRect(x, baselineY + 2, barWidth, reflectionH);
        }
      } else if (visualizerMode === "wave") {
        // --- 2. AUDIOPHILE OSCILLOSCOPE SINE WAVES ---
        const centerY = renderH * 0.58;
        const waveCount = 4;
        const colors = [
          "rgba(255, 248, 220, 0.85)",
          "rgba(212, 175, 55, 0.65)",
          "rgba(197, 160, 89, 0.45)",
          "rgba(140, 110, 45, 0.3)",
        ];

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const speed = (w + 1) * 0.8;
          const amp = (80 + w * 25) * energyMultiplier;
          const freq = 0.0035 + w * 0.0012;

          for (let x = 0; x <= renderW; x += 4) {
            const y =
              centerY +
              Math.sin(x * freq + phase * speed) * amp +
              Math.cos(x * 0.0015 - phase * 0.7) * (amp * 0.4);

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.strokeStyle = colors[w];
          ctx.lineWidth = 2.5 - w * 0.4;
          ctx.shadowColor = "#D4AF37";
          ctx.shadowBlur = 14;
          ctx.stroke();
        }

        ctx.restore();
      } else if (visualizerMode === "radial") {
        // --- 3. RADIAL ACOUSTIC HALO (Radiates from Center Vinyl) ---
        const centerX = renderW / 2;
        const centerY = renderH * 0.46;
        const baseRadius = 135;
        const rayCount = 72;

        ctx.save();
        ctx.translate(centerX, centerY);

        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2;
          const wave =
            Math.sin(angle * 4 + phase * 2.5) * 0.5 +
            Math.cos(angle * 7 - phase * 1.8) * 0.35 +
            0.5;

          const rayLen =
            Math.max(4, wave * 75 * energyMultiplier) +
            Math.sin(phase * 3 + i) * 8 * energyMultiplier;

          const x1 = Math.cos(angle) * (baseRadius + 6);
          const y1 = Math.sin(angle) * (baseRadius + 6);
          const x2 = Math.cos(angle) * (baseRadius + 6 + rayLen);
          const y2 = Math.sin(angle) * (baseRadius + 6 + rayLen);

          const rayGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          rayGrad.addColorStop(0, "rgba(212, 175, 55, 0.4)");
          rayGrad.addColorStop(1, "rgba(255, 248, 220, 0.95)");

          ctx.strokeStyle = rayGrad;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Concentric acoustic ripple ring
        const rippleR = baseRadius + 18 + (phase * 15) % 90;
        const rippleAlpha = Math.max(0, 1 - (rippleR - baseRadius) / 90) * 0.4;
        ctx.strokeStyle = `rgba(212, 175, 55, ${rippleAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isVisualizerOpen, visualizerMode, isPlaying, volume, isMuted]);

  if (!isVisualizerOpen) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[80] bg-black select-none overflow-hidden flex flex-col justify-between animate-in fade-in duration-300"
    >
      {/* Background Ambient Spotlight Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,rgba(212,175,55,0.08),rgba(6,7,9,0.95))]" />

      {/* Interactive 60fps Canvas Visualizer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* TOP HUD BAR */}
      <header
        className={`relative z-20 flex items-center justify-between px-6 py-5 transition-opacity duration-300 ${
          isControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Left: Mode Title & Hi-Fi Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-white tracking-widest uppercase flex items-center gap-2">
              Aether Audiophile Spectrum
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40">
                24-Bit / 96kHz Lossless
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              Live Acoustic Resonance Engine
            </p>
          </div>
        </div>

        {/* Center: Visualizer Mode Selector */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setVisualizerMode("bars")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              visualizerMode === "bars"
                ? "bg-[#D4AF37] text-black shadow-md font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Bars</span>
          </button>

          <button
            onClick={() => setVisualizerMode("wave")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              visualizerMode === "wave"
                ? "bg-[#D4AF37] text-black shadow-md font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Wave</span>
          </button>

          <button
            onClick={() => setVisualizerMode("radial")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              visualizerMode === "radial"
                ? "bg-[#D4AF37] text-black shadow-md font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Radial</span>
          </button>
        </div>

        {/* Right: Fullscreen & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Toggle True Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={toggleVisualizer}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Exit Visualizer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CENTER STAGE: LUXURY VINYL ARTWORK & TRACK DETAILS */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto px-6 text-center pointer-events-none">
        {currentTrack ? (
          <>
            {/* Spinning Ambient Vinyl Disk */}
            <div className="relative mb-6">
              <div
                className={`relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden bg-black p-2 border-2 border-[#D4AF37]/50 shadow-[0_0_60px_rgba(212,175,55,0.25),0_0_120px_rgba(0,0,0,0.9)] transition-transform duration-700 ${
                  isPlaying ? "animate-[spin_24s_linear_infinite]" : ""
                }`}
              >
                {/* Vinyl Grooves Texture */}
                <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none opacity-40" />
                <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-7 rounded-full border border-white/5 pointer-events-none" />

                {/* Center Artwork */}
                <div className="w-full h-full rounded-full overflow-hidden border border-[#D4AF37]/40">
                  <img
                    src={getHighResThumbnail(
                      currentTrack.thumbnail,
                      currentTrack.id
                    )}
                    alt={currentTrack.title}
                    onError={(e) => handleImageError(e, currentTrack.id)}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Center Spindle Hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-zinc-950 border-2 border-[#D4AF37] shadow-inner flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black border border-white/20" />
                </div>
              </div>
            </div>

            {/* Song Metadata */}
            <div className="max-w-xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-wide truncate drop-shadow-md">
                {currentTrack.title}
              </h2>
              <p className="text-sm md:text-base text-[#F3E5AB] font-medium tracking-wider mt-1 truncate">
                {currentTrack.artist}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                {currentTrack.album || "Aether Hi-Fi Master"}
              </p>
            </div>
          </>
        ) : (
          <div className="text-zinc-500 text-sm font-mono">
            Aether Standby • Select a track to activate spectrum
          </div>
        )}
      </div>

      {/* BOTTOM HUD: MINIMALIST FLOATING PLAYBACK DOCK */}
      <footer
        className={`relative z-20 flex flex-col items-center gap-3 px-6 py-6 pb-8 transition-opacity duration-300 ${
          isControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="w-full max-w-xl flex items-center gap-3 select-none">
          <span className="text-[10px] text-zinc-400 font-mono w-9 text-right tabular-nums">
            {formatTime(progress)}
          </span>

          <div className="relative flex items-center w-full h-1.5 bg-zinc-800/80 rounded-full cursor-pointer group">
            <div
              className="h-full bg-gradient-to-r from-[#C5A059] to-[#F3E5AB] rounded-full pointer-events-none"
              style={{
                width: `${
                  duration > 0
                    ? Math.min(100, Math.max(0, (progress / duration) * 100))
                    : 0
                }%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              disabled={!currentTrack}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>

          <span className="text-[10px] text-zinc-400 font-mono w-9 text-left tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-6 mt-1">
          <button
            onClick={prevTrack}
            disabled={!currentTrack}
            className="text-zinc-400 hover:text-white transition disabled:opacity-30 p-2"
            title="Previous (P)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#C5A059] via-[#D4AF37] to-[#F3E5AB] text-black flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            className="text-zinc-400 hover:text-white transition disabled:opacity-30 p-2"
            title="Next (N)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-xl transition ${
              isLyricsOpen
                ? "text-[#D4AF37] bg-[#D4AF37]/20 border border-[#D4AF37]/40"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            title="Synced Lyrics Overlay (L)"
          >
            <Mic2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
