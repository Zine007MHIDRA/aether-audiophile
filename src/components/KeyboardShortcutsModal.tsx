"use client";

import React, { useEffect, useState } from "react";
import { X, Command, Sparkles, Keyboard } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

interface ShortcutItem {
  key: string;
  label: string;
  action: string;
}

const SHORTCUT_GROUPS: { group: string; shortcuts: ShortcutItem[] }[] = [
  {
    group: "Playback",
    shortcuts: [
      { key: "Space", label: "Spacebar", action: "Play / Pause" },
      { key: "N", label: "N", action: "Next Track" },
      { key: "P", label: "P", action: "Previous Track" },
      { key: "→ / ←", label: "Right / Left", action: "Seek 5 seconds" },
      { key: "J / K", label: "J / K", action: "Seek 10 seconds" },
    ],
  },
  {
    group: "Audio & Modes",
    shortcuts: [
      { key: "M", label: "M", action: "Mute / Unmute" },
      { key: "L", label: "L", action: "Synced Lyrics" },
      { key: "V", label: "V", action: "Spectrum Visualizer" },
      { key: "Q", label: "Q", action: "Up Next Queue" },
      { key: "S", label: "S", action: "Toggle Shuffle" },
      { key: "R", label: "R", action: "Cycle Repeat Mode" },
    ],
  },
  {
    group: "Navigation & System",
    shortcuts: [
      { key: "/", label: "/", action: "Focus Search" },
      { key: "?", label: "? (Shift + /)", action: "Keyboard Shortcuts" },
      { key: "Esc", label: "Escape", action: "Close Modals / Drawers" },
    ],
  },
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    currentTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    progress,
    duration,
    setProgress,
    toggleMute,
    toggleLyrics,
    toggleQueue,
    toggleVisualizer,
    toggleShuffle,
    toggleRepeat,
    setIsQueueOpen,
  } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Allow Escape even inside input to unfocus or close
      if (e.key === "Escape") {
        if (isOpen) {
          setIsOpen(false);
          return;
        }
        if (isInput) {
          target.blur();
          return;
        }
      }

      if (isInput) return;

      switch (e.key) {
        case " ": // Space
          e.preventDefault();
          if (currentTrack) {
            togglePlay();
          }
          break;

        case "n":
        case "N":
          e.preventDefault();
          nextTrack();
          break;

        case "p":
        case "P":
          e.preventDefault();
          prevTrack();
          break;

        case "ArrowRight":
          e.preventDefault();
          if (currentTrack && duration > 0) {
            setProgress(Math.min(duration, progress + 5));
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (currentTrack) {
            setProgress(Math.max(0, progress - 5));
          }
          break;

        case "k":
        case "K":
          e.preventDefault();
          if (currentTrack && duration > 0) {
            setProgress(Math.min(duration, progress + 10));
          }
          break;

        case "j":
        case "J":
          e.preventDefault();
          if (currentTrack) {
            setProgress(Math.max(0, progress - 10));
          }
          break;

        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;

        case "l":
        case "L":
          e.preventDefault();
          toggleLyrics();
          break;

        case "v":
        case "V":
          e.preventDefault();
          toggleVisualizer();
          break;

        case "q":
        case "Q":
          e.preventDefault();
          toggleQueue();
          break;

        case "s":
        case "S":
          e.preventDefault();
          toggleShuffle();
          break;

        case "r":
        case "R":
          e.preventDefault();
          toggleRepeat();
          break;

        case "/":
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            "input[type='text'], input[placeholder*='Search']"
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;

        case "?":
          e.preventDefault();
          setIsOpen((prev) => !prev);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    currentTrack,
    duration,
    progress,
    togglePlay,
    nextTrack,
    prevTrack,
    setProgress,
    toggleMute,
    toggleLyrics,
    toggleQueue,
    toggleVisualizer,
    toggleShuffle,
    toggleRepeat,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(212,175,55,0.2)] p-6 select-none animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40">
                  Hi-Fi Hotkeys
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Control playback and navigate seamlessly from your keyboard
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Groups Grid */}
        <div className="py-4 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.group}>
              <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block mb-2">
                {group.group}
              </span>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <span className="text-zinc-300 font-medium">
                      {sc.action}
                    </span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/15 text-[11px] font-mono text-[#F3E5AB] shadow-inner font-semibold">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Press &ldquo;?&rdquo; anytime to toggle</span>
          <span>Aether Audio Engine</span>
        </div>
      </div>
    </div>
  );
}
