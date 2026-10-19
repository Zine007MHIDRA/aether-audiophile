"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

interface ParsedLyric {
  time: number;
  text: string;
}

function parseLrc(lrc: string): ParsedLyric[] {
  const lines = lrc.split("\n");
  const result: ParsedLyric[] = [];

  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        result.push({
          time: minutes * 60 + seconds,
          text,
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function LyricsModal() {
  const { currentTrack, progress, isLyricsOpen, toggleLyrics } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState<ParsedLyric[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;

    let cancelled = false;
    setLoading(true);
    setSyncedLyrics([]);
    setPlainLyrics(null);

    fetch(
      `/api/lyrics?track=${encodeURIComponent(
        currentTrack.title
      )}&artist=${encodeURIComponent(currentTrack.artist)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLoading(false);
        if (data.syncedLyrics) {
          setSyncedLyrics(parseLrc(data.syncedLyrics));
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Lyrics error:", err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack, isLyricsOpen]);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [progress]);

  if (!isLyricsOpen || !currentTrack) return null;

  let activeIndex = -1;
  for (let i = 0; i < syncedLyrics.length; i++) {
    if (progress >= syncedLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-aether-black/95 backdrop-blur-3xl p-8 overflow-y-auto flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between pb-6 border-b border-aether-border/40 sticky top-0 bg-transparent backdrop-blur-md z-10">
        <div className="flex items-center gap-3.5">
          <Sparkles className="w-5 h-5 text-aether-gold" />
          <div className="flex flex-col">
            <span className="text-white font-bold text-base tracking-wide truncate">
              {currentTrack.title}
            </span>
            <span className="text-aether-gold text-xs font-mono uppercase tracking-widest mt-0.5">
              {currentTrack.artist}
            </span>
          </div>
        </div>
        <button
          onClick={toggleLyrics}
          className="p-2 rounded-full hover:bg-aether-elevated text-aether-subdued hover:text-white transition border border-aether-border/40"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lyrics Scroller */}
      <div className="w-full max-w-3xl py-20 flex flex-col gap-8 text-center select-text">
        {loading ? (
          <div className="text-aether-subdued text-xs font-mono uppercase tracking-widest animate-pulse my-20">
            Fetching acoustic telemetry & lyrics...
          </div>
        ) : syncedLyrics.length > 0 ? (
          syncedLyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`transition-all duration-300 font-medium text-2xl md:text-4xl cursor-default tracking-tight leading-relaxed ${
                  isActive
                    ? "text-aether-gold scale-105 font-bold drop-shadow-[0_0_20px_rgba(230,194,128,0.3)]"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : plainLyrics ? (
          <div className="text-white/80 whitespace-pre-line text-lg leading-loose font-serif">
            {plainLyrics}
          </div>
        ) : (
          <div className="text-aether-subdued text-sm font-mono my-20">
            Acoustic transcripts unavailable for this track.
          </div>
        )}
      </div>
    </div>
  );
}
