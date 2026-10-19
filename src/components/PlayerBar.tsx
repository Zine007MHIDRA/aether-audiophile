"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Heart,
  Mic2,
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

  // Sync audio source when track changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (currentTrack) {
      audioRef.current.src = `/api/stream?id=${currentTrack.id}`;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay was prevented:", err);
        });
      }
    } else {
      audioRef.current.src = "";
    }
  }, [currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => console.warn(err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Handle Volume & Mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Web Media Session API (Hardware keys & lock-screen integration)
  useEffect(() => {
    if (!currentTrack || typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "Single",
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
        preload="auto"
      />

      <div className="h-20 bg-spotify-black border-t border-spotify-highlight px-4 flex items-center justify-between select-none z-50">
        {/* Left: Current Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          {currentTrack ? (
            <>
              <div className="relative w-14 h-14 rounded overflow-hidden shrink-0 bg-spotify-highlight shadow-md">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-white text-sm font-medium truncate hover:underline cursor-pointer">
                  {currentTrack.title}
                </span>
                <span className="text-spotify-subdued text-xs truncate hover:underline cursor-pointer">
                  {currentTrack.artist}
                </span>
              </div>
              <button
                onClick={() => currentTrack && toggleLike(currentTrack.id)}
                className="text-spotify-subdued hover:text-white transition p-1"
                title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isLiked ? "fill-spotify-green text-spotify-green" : ""
                  }`}
                />
              </button>
            </>
          ) : (
            <div className="text-spotify-subdued text-xs">No track playing</div>
          )}
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1 w-2/4 max-w-xl">
          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1 transition ${
                isShuffle ? "text-spotify-green" : "text-spotify-subdued hover:text-white"
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={prevTrack}
              disabled={!currentTrack}
              className="text-spotify-subdued hover:text-white disabled:opacity-30 transition p-1"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 transition flex items-center justify-center text-black shadow-md disabled:opacity-40"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5" />
              )}
            </button>
            <button
              onClick={nextTrack}
              disabled={!currentTrack}
              className="text-spotify-subdued hover:text-white disabled:opacity-30 transition p-1"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-1 transition relative ${
                repeatMode !== "off"
                  ? "text-spotify-green"
                  : "text-spotify-subdued hover:text-white"
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold">1</span>
              )}
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-2 w-full group">
            <span className="text-[11px] text-spotify-subdued w-10 text-right tabular-nums">
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
            <span className="text-[11px] text-spotify-subdued w-10 text-left tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Utilities */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
          <button
            onClick={toggleLyrics}
            className={`p-1 transition ${
              isLyricsOpen ? "text-spotify-green" : "text-spotify-subdued hover:text-white"
            }`}
            title="Lyrics"
          >
            <Mic2 className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 group w-32">
            <button
              onClick={toggleMute}
              className="text-spotify-subdued hover:text-white transition"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
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
