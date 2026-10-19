"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Mic2 } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

interface ParsedLyric {
  time: number; // in seconds
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

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [progress]);

  if (!isLyricsOpen || !currentTrack) return null;

  // Determine current active lyric line
  let activeIndex = -1;
  for (let i = 0; i < syncedLyrics.length; i++) {
    if (progress >= syncedLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return (
    <div className="fixed inset-0 top-0 bottom-20 z-40 bg-gradient-to-b from-indigo-950 via-spotify-dark to-black p-8 overflow-y-auto flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between pb-6 border-b border-white/10 sticky top-0 bg-transparent backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Mic2 className="w-6 h-6 text-spotify-green" />
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg truncate">
              {currentTrack.title}
            </span>
            <span className="text-spotify-subdued text-xs">
              {currentTrack.artist}
            </span>
          </div>
        </div>
        <button
          onClick={toggleLyrics}
          className="p-2 rounded-full hover:bg-white/10 text-white transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Lyrics Content */}
      <div className="w-full max-w-2xl py-12 flex flex-col gap-6 text-center select-text">
        {loading ? (
          <div className="text-spotify-subdued text-sm animate-pulse my-12">
            Searching for lyrics...
          </div>
        ) : syncedLyrics.length > 0 ? (
          syncedLyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`transition-all duration-300 font-bold text-2xl md:text-3xl cursor-default ${
                  isActive
                    ? "text-white scale-105"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : plainLyrics ? (
          <div className="text-white/80 whitespace-pre-line text-lg leading-relaxed">
            {plainLyrics}
          </div>
        ) : (
          <div className="text-spotify-subdued text-sm my-12">
            Couldn&apos;t find lyrics for this song.
          </div>
        )}
      </div>
    </div>
  );
}
