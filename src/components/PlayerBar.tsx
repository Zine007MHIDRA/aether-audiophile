"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Bookmark,
  Mic2,
  AlertCircle,
} from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function PlayerBar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasError, setHasError] = useState(false);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    repeatMode,
    isShuffle,
    likedTrackIds,
    isLyricsOpen,
    togglePlay,
    setIsPlaying,
    nextTrack,
    prevTrack,
    setProgress,
    setDuration,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleLike,
    toggleLyrics,
  } = usePlayerStore();

  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;

  useEffect(() => {
    if (!audioRef.current) return;
    setHasError(false);

    if (currentTrack) {
      audioRef.current.src = `/api/stream?id=${currentTrack.id}`;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.warn("Autoplay notice:", err));
      }
    } else {
      audioRef.current.src = "";
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => console.warn(err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!currentTrack || typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "Aether Hi-Fi",
      artwork: [
        {
          src: currentTrack.thumbnail,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime);
      }
    });
  }, [currentTrack, nextTrack, prevTrack, setIsPlaying, setProgress]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentTrack?.duration || 0);
    }
  };

  const handleEnded = () => {
    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const handleAudioError = () => {
    console.warn("Audio stream error occurred, skipping to next track in 2s...");
    setHasError(true);
    setTimeout(() => {
      setHasError(false);
      nextTrack();
    }, 2000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setProgress(newTime);
  };

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      {/* Floating Dynamic Island Player Dock */}
      <div className="fixed bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 w-[95%] md:w-[92%] max-w-4xl z-50 bg-aether-surface/90 backdrop-blur-2xl border border-aether-gold/25 shadow-island rounded-2xl px-3 md:px-5 py-2.5 md:py-3 select-none flex items-center justify-between transition-all duration-300">
        {/* Left: Track Information */}
        <div className="flex items-center gap-2.5 md:gap-3.5 flex-1 md:flex-initial md:w-1/4 min-w-0 pr-2">
          {currentTrack ? (
            <>
              <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 bg-aether-elevated border border-aether-border/60 shadow-md">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-white text-xs font-semibold tracking-wide truncate hover:text-aether-gold transition cursor-pointer">
                  {currentTrack.title}
                </span>
                <span className="text-aether-subdued text-[10px] md:text-[11px] truncate mt-0.5">
                  {currentTrack.artist}
                </span>
              </div>
              <button
                onClick={() => currentTrack && toggleLike(currentTrack)}
                className={`p-1.5 rounded-lg transition shrink-0 ${
                  isLiked
                    ? "text-aether-gold bg-aether-gold/15"
                    : "text-aether-muted hover:text-white"
                }`}
                title={isLiked ? "Saved in Vault" : "Save to Vault"}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isLiked ? "fill-aether-gold" : ""}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-aether-muted text-[11px] font-mono tracking-wider truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-aether-border animate-ping shrink-0" />
              <span className="truncate">Aether Standby</span>
            </div>
          )}
        </div>

        {/* Center: Controls & Continuous Scrubber */}
        <div className="flex flex-col items-center gap-1 md:gap-1.5 flex-1 max-w-[280px] sm:max-w-xs md:max-w-md">
          {hasError ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Stream interrupted, advancing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-1 transition hidden sm:block ${
                  isShuffle ? "text-aether-gold" : "text-aether-muted hover:text-white"
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={prevTrack}
                disabled={!currentTrack}
                className="text-aether-subdued hover:text-white disabled:opacity-30 transition p-1"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-aether-gold-muted via-aether-gold to-aether-gold-hover hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-black shadow-gold-glow disabled:opacity-30 shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                )}
              </button>
              <button
                onClick={nextTrack}
                disabled={!currentTrack}
                className="text-aether-subdued hover:text-white disabled:opacity-30 transition p-1"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-1 transition relative hidden sm:block ${
                  repeatMode !== "off"
                    ? "text-aether-gold"
                    : "text-aether-muted hover:text-white"
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat className="w-3.5 h-3.5" />
                {repeatMode === "one" && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold text-aether-gold">
                    1
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Scrubber Bar */}
          <div className="flex items-center gap-2 w-full group">
            <span className="text-[9px] md:text-[10px] text-aether-subdued font-mono w-7 md:w-8 text-right tabular-nums">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              disabled={!currentTrack}
              className="w-full"
            />
            <span className="text-[9px] md:text-[10px] text-aether-subdued font-mono w-7 md:w-8 text-left tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Real-time Lyrics */}
        <div className="flex items-center justify-end gap-2.5 md:gap-3.5 md:w-1/4 shrink-0 pl-2">
          <button
            onClick={toggleLyrics}
            className={`p-1.5 rounded-lg transition ${
              isLyricsOpen
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Synced Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Volume slider (desktop only, phones have physical rockers) */}
          <div className="hidden md:flex items-center gap-2 group w-24 lg:w-28">
            <button
              onClick={toggleMute}
              className="text-aether-muted hover:text-white transition shrink-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </>
  );
}
