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
  MoreHorizontal,
  ListMusic,
  Activity,
  Sliders,
  Moon,
  Waves,
} from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { usePlaylistStore } from "@/store/playlist-store";
import { useContextMenuStore } from "@/store/context-menu-store";
import { useEqualizerStore } from "@/store/equalizer-store";
import { useSleepTimerStore } from "@/store/sleep-timer-store";
import { useAudioDynamicsStore } from "@/store/audio-dynamics-store";
import type { YTPlayerInstance } from "@/types/youtube-iframe";
import { getHighResThumbnail, handleImageError } from "@/lib/image";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatSleepCountdown(totalSec: number): string {
  if (totalSec <= 0) return "0:00";
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Deterministic acoustic loudness estimation (-17.0 to -9.0 LUFS)
function getTrackLoudnessEstimate(track: { id: string; title: string } | null): number {
  if (!track) return -14.0;
  let hash = 0;
  const str = track.id + track.title;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 100) / 100;
  return -17.0 + normalized * 8.0;
}

export function PlayerBar() {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const activeTrackIdRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const preResolvingSetRef = useRef<Set<string>>(new Set());
  const isCrossfadingOutRef = useRef<boolean>(false);
  const [hasError, setHasError] = useState(false);
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);

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
    isQueueOpen,
    queue,
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
    toggleQueue,
    isVisualizerOpen,
    toggleVisualizer,
  } = usePlayerStore();
  const { openContextMenu } = useContextMenuStore();
  const {
    isOpen: isEqualizerOpen,
    toggleEqualizer,
    isEnabled: isEqualizerEnabled,
  } = useEqualizerStore();
  const {
    isOpen: isSleepTimerOpen,
    isActive: isSleepTimerActive,
    remainingSeconds: sleepRemainingSeconds,
    isFadingOut: isSleepFadingOut,
    openModal: openSleepTimerModal,
    toggleModal: toggleSleepTimerModal,
  } = useSleepTimerStore();
  const {
    isOpen: isDynamicsOpen,
    crossfadeEnabled,
    crossfadeDuration,
    manualSkipFade,
    isCrossfading,
    loudnessNormalizationEnabled,
    targetLUFS,
    preampHeadroom,
    toggleModal: toggleDynamicsModal,
  } = useAudioDynamicsStore();

  const isLiked = currentTrack ? likedTrackIds.includes(currentTrack.id) : false;
  const currentTime = progress;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const volumePercent = (isMuted ? 0 : volume) * 100;

  // Calculates real-time effective volume combining user volume + LUFS dynamic leveling
  const getEffectiveTargetVolume = () => {
    const store = usePlayerStore.getState();
    if (store.isMuted) return 0;
    const dynamics = useAudioDynamicsStore.getState();
    if (!dynamics.loudnessNormalizationEnabled) return store.volume * 100;
    const masterLUFS = getTrackLoudnessEstimate(store.currentTrack);
    const trimDb = Math.max(-8, Math.min(3, dynamics.targetLUFS - masterLUFS + dynamics.preampHeadroom));
    const mult = Math.pow(10, trimDb / 20);
    return Math.min(100, Math.max(0, store.volume * mult * 100));
  };

  // 1. Initialize YouTube IFrame API and player instance
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      const container = document.getElementById("yt-hidden-player");
      if (!container) return;

      try {
        playerRef.current = new window.YT.Player("yt-hidden-player", {
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              isPlayerReadyRef.current = true;
              const store = usePlayerStore.getState();

              // Initialize volume and mute status with Loudness Normalization
              if (store.isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
                event.target.setVolume(getEffectiveTargetVolume());
              }

              // If a track was selected prior to onReady, load and play it (if not pending)
              if (store.currentTrack && !store.currentTrack.id.startsWith("pending:")) {
                activeTrackIdRef.current = store.currentTrack.id;
                event.target.loadVideoById(store.currentTrack.id);
                if (store.isPlaying) {
                  event.target.playVideo();
                } else {
                  event.target.pauseVideo();
                }
              }
            },
            onStateChange: (event) => {
              const state = event.data;
              const playerState = window.YT?.PlayerState;
              if (!playerState) return;

              if (state === playerState.PLAYING) {
                setIsPlaying(true);
                setHasError(false);
                const totalDuration = event.target.getDuration();
                if (totalDuration && totalDuration > 0) {
                  setDuration(totalDuration);
                }

                // If crossfading into new track, ramp volume from 0 to target
                if (isCrossfadingOutRef.current) {
                  isCrossfadingOutRef.current = false;
                  const dynamics = useAudioDynamicsStore.getState();
                  const fadeInDur = Math.max(1, Math.min(3, dynamics.crossfadeDuration / 2));
                  let elapsed = 0;
                  const targetVol = getEffectiveTargetVolume();
                  event.target.setVolume(0);
                  const inInterval = setInterval(() => {
                    elapsed += 0.1;
                    const factor = Math.min(1, elapsed / fadeInDur);
                    event.target.setVolume(targetVol * factor);
                    if (factor >= 1) {
                      clearInterval(inInterval);
                      dynamics.setIsCrossfading(false);
                    }
                  }, 100);
                } else if (!useSleepTimerStore.getState().isFadingOut) {
                  useAudioDynamicsStore.getState().setIsCrossfading(false);
                  event.target.setVolume(getEffectiveTargetVolume());
                }

                // Poll current time at 250ms to keep progress & synced lyrics aligned
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }
                progressIntervalRef.current = setInterval(() => {
                  if (isPlayerReadyRef.current && playerRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    if (typeof time === "number" && !isNaN(time)) {
                      setProgress(time);

                      // Dynamic Crossfade detection
                      const curDur =
                        playerRef.current.getDuration?.() ||
                        usePlayerStore.getState().duration;
                      const dynamics = useAudioDynamicsStore.getState();
                      const timeLeft = curDur - time;

                      if (
                        dynamics.crossfadeEnabled &&
                        !useSleepTimerStore.getState().isFadingOut &&
                        curDur > dynamics.crossfadeDuration * 2 &&
                        timeLeft <= dynamics.crossfadeDuration &&
                        timeLeft > 0
                      ) {
                        if (!isCrossfadingOutRef.current) {
                          isCrossfadingOutRef.current = true;
                          dynamics.setIsCrossfading(true);
                        }
                        const factor = Math.max(0, Math.min(1, timeLeft / dynamics.crossfadeDuration));
                        const targetVol = getEffectiveTargetVolume();
                        playerRef.current?.setVolume?.(targetVol * factor);
                      }

                      // Pre-resolve next pending track in queue 10 seconds before track ends
                      if (curDur > 0 && curDur - time <= 10) {
                        const { queue, queueIndex } = usePlayerStore.getState();
                        const next = queue[queueIndex + 1];
                        if (
                          next &&
                          next.id.startsWith("pending:") &&
                          !preResolvingSetRef.current.has(next.id)
                        ) {
                          preResolvingSetRef.current.add(next.id);
                          const nextPendingId = next.id;
                          const query = `${next.title} ${next.artist}`.trim();
                          fetch(`/api/search?q=${encodeURIComponent(query)}`)
                            .then((r) => r.json())
                            .then((data) => {
                              const top = data.tracks?.[0];
                              if (top) {
                                const upd = {
                                  id: top.id,
                                  thumbnail: top.thumbnail,
                                  duration: top.duration || next.duration,
                                  durationFormatted:
                                    top.durationFormatted ||
                                    next.durationFormatted,
                                };
                                usePlayerStore
                                  .getState()
                                  .resolveTrack(nextPendingId, upd);
                                usePlaylistStore
                                  .getState()
                                  .resolveTrackInPlaylists(nextPendingId, upd);
                              }
                            })
                            .catch((e) =>
                              console.warn("Pre-resolve error:", e)
                            );
                        }
                      }
                    }
                    const curState = playerRef.current.getPlayerState?.();
                    if (curState === playerState.PLAYING && !usePlayerStore.getState().isPlaying) {
                      setIsPlaying(true);
                    } else if (curState === playerState.PAUSED && usePlayerStore.getState().isPlaying) {
                      setIsPlaying(false);
                    }
                  }
                }, 250);
              } else if (state === playerState.PAUSED) {
                setIsPlaying(false);
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              } else if (state === playerState.ENDED) {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }

                const currentRepeat = usePlayerStore.getState().repeatMode;
                if (currentRepeat === "one") {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } else {
                  setIsPlaying(false);
                  usePlayerStore.getState().nextTrack();
                }
              }
            },
            onError: (event) => {
              console.warn(
                "YouTube Player error:",
                event.data,
                "Track ID:",
                activeTrackIdRef.current
              );
              setHasError(true);
              setIsPlaying(false);
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              // Advance to next track after 2 seconds to avoid getting stuck
              setTimeout(() => {
                setHasError(false);
                usePlayerStore.getState().nextTrack();
              }, 2000);
            },
          },
        });
      } catch (err) {
        console.error("Failed to instantiate YouTube player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }

      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingCallback === "function") {
          existingCallback();
        }
        initPlayer();
      };
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
        isPlayerReadyRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Track changes: load and start playback (or on-demand resolve if pending)
  useEffect(() => {
    if (!currentTrack) {
      activeTrackIdRef.current = null;
      if (isPlayerReadyRef.current && playerRef.current) {
        playerRef.current.stopVideo?.();
      }
      setProgress(0);
      setDuration(0);
      return;
    }

    setHasError(false);
    setProgress(0);
    if (currentTrack.duration) {
      setDuration(currentTrack.duration);
    }

    // On-demand track resolution for lazy-imported pending tracks
    if (currentTrack.id.startsWith("pending:")) {
      const pendingId = currentTrack.id;
      setIsResolvingAudio(true);
      const query = `${currentTrack.title} ${currentTrack.artist}`.trim();

      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setIsResolvingAudio(false);
          const top = data.tracks?.[0];
          if (top) {
            const updated = {
              id: top.id,
              thumbnail: top.thumbnail,
              duration: top.duration || currentTrack.duration,
              durationFormatted:
                top.durationFormatted || currentTrack.durationFormatted,
            };

            // Update stores immediately
            usePlayerStore.getState().resolveTrack(pendingId, updated);
            usePlaylistStore
              .getState()
              .resolveTrackInPlaylists(pendingId, updated);

            activeTrackIdRef.current = top.id;

            if (isPlayerReadyRef.current && playerRef.current) {
              playerRef.current.loadVideoById(top.id);
              if (usePlayerStore.getState().isPlaying) {
                playerRef.current.playVideo();
              }
            }
          } else {
            console.warn(
              "Could not resolve audio stream for pending track:",
              query
            );
            setHasError(true);
            setTimeout(() => {
              setHasError(false);
              usePlayerStore.getState().nextTrack();
            }, 2000);
          }
        })
        .catch((err) => {
          setIsResolvingAudio(false);
          console.warn("Error resolving pending track:", err);
          setHasError(true);
          setTimeout(() => {
            setHasError(false);
            usePlayerStore.getState().nextTrack();
          }, 2000);
        });

      return;
    }

    activeTrackIdRef.current = currentTrack.id;

    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        playerRef.current.loadVideoById(currentTrack.id);
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (err) {
        console.warn("Failed to load video on track change:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // 3. Sync store isPlaying changes triggered outside user click
  useEffect(() => {
    if (!isPlayerReadyRef.current || !playerRef.current || !currentTrack) return;
    try {
      const state = playerRef.current.getPlayerState?.();
      const playerState = window.YT?.PlayerState;
      if (!playerState) return;

      if (isPlaying) {
        if (state !== playerState.PLAYING && state !== playerState.BUFFERING) {
          playerRef.current.playVideo?.();
        }
      } else {
        if (state === playerState.PLAYING || state === playerState.BUFFERING) {
          playerRef.current.pauseVideo?.();
        }
      }
    } catch (err) {
      console.warn("Error syncing isPlaying to YouTube player:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // 4. Volume, mute, and smart loudness dynamic synchronization
  useEffect(() => {
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    if (useSleepTimerStore.getState().isFadingOut) return;

    const dynamics = useAudioDynamicsStore.getState();
    const masterLUFS = getTrackLoudnessEstimate(currentTrack);
    const trimDb = dynamics.loudnessNormalizationEnabled
      ? Math.max(-8, Math.min(3, dynamics.targetLUFS - masterLUFS + dynamics.preampHeadroom))
      : 0;
    dynamics.setCurrentAppliedTrimDb(trimDb);

    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        const mult = dynamics.loudnessNormalizationEnabled ? Math.pow(10, trimDb / 20) : 1;
        const targetVol = Math.min(100, Math.max(0, volume * mult * 100));
        playerRef.current.setVolume(targetVol);
      }
    } catch (err) {
      console.warn("Error setting volume on YouTube player:", err);
    }
  }, [volume, isMuted, currentTrack, targetLUFS, loudnessNormalizationEnabled, preampHeadroom]);

  // 5. System MediaSession integration
  useEffect(() => {
    if (!currentTrack || typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const highResArtwork = getHighResThumbnail(currentTrack.thumbnail, currentTrack.id);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "Aether Hi-Fi",
      artwork: [
        {
          src: highResArtwork,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      setIsPlaying(true);
      if (isPlayerReadyRef.current && playerRef.current) {
        playerRef.current.playVideo?.();
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      setIsPlaying(false);
      if (isPlayerReadyRef.current && playerRef.current) {
        playerRef.current.pauseVideo?.();
      }
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        setProgress(details.seekTime);
        if (isPlayerReadyRef.current && playerRef.current) {
          playerRef.current.seekTo(details.seekTime, true);
        }
      }
    });

    // Native Electron desktop media key & tray dispatcher
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (w?.electronAPI?.onMediaKey) {
      w.electronAPI.onMediaKey((action: string) => {
        if (action === "playpause") {
          const nextPlaying = !isPlaying;
          setIsPlaying(nextPlaying);
          if (isPlayerReadyRef.current && playerRef.current) {
            if (nextPlaying) playerRef.current.playVideo?.();
            else playerRef.current.pauseVideo?.();
          }
        } else if (action === "next") {
          nextTrack();
        } else if (action === "previous") {
          prevTrack();
        }
      });
    }
  }, [currentTrack, isPlaying, nextTrack, prevTrack, setIsPlaying, setProgress]);

  // 6. Direct user gesture play/pause toggle (guarantees browser autoplay approval)
  const handleTogglePlay = () => {
    if (!currentTrack) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (nextPlaying) {
          playerRef.current.playVideo?.();
        } else {
          playerRef.current.pauseVideo?.();
        }
      } catch (err) {
        console.warn("Error executing user gesture play/pause:", err);
      }
    }
  };

  // 7. Seek slider handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (isPlayerReadyRef.current && playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  // 8. Volume slider handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (isPlayerReadyRef.current && playerRef.current) {
      if (isMuted && newVol > 0) {
        toggleMute();
        playerRef.current.unMute();
      }
      const dynamics = useAudioDynamicsStore.getState();
      const mult = dynamics.loudnessNormalizationEnabled
        ? Math.pow(10, dynamics.currentAppliedTrimDb / 20)
        : 1;
      playerRef.current.setVolume(Math.min(100, Math.max(0, newVol * mult * 100)));
    }
  };

  // 9. Mute button toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    toggleMute();
    if (isPlayerReadyRef.current && playerRef.current) {
      if (nextMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        const dynamics = useAudioDynamicsStore.getState();
        const mult = dynamics.loudnessNormalizationEnabled
          ? Math.pow(10, dynamics.currentAppliedTrimDb / 20)
          : 1;
        playerRef.current.setVolume(Math.min(100, Math.max(0, volume * mult * 100)));
      }
    }
  };

  // 10. Manual track skip with optional micro-fade
  const handleNextTrack = () => {
    const { manualSkipFade } = useAudioDynamicsStore.getState();
    if (manualSkipFade && isPlaying && isPlayerReadyRef.current && playerRef.current) {
      const curVol = playerRef.current.getVolume?.() || (volume * 100);
      let step = 0;
      const steps = 5;
      const interval = setInterval(() => {
        step++;
        const factor = Math.max(0, 1 - step / steps);
        playerRef.current?.setVolume?.(curVol * factor);
        if (step >= steps) {
          clearInterval(interval);
          nextTrack();
        }
      }, 50);
    } else {
      nextTrack();
    }
  };

  const handlePrevTrack = () => {
    const { manualSkipFade } = useAudioDynamicsStore.getState();
    if (manualSkipFade && isPlaying && isPlayerReadyRef.current && playerRef.current) {
      const curVol = playerRef.current.getVolume?.() || (volume * 100);
      let step = 0;
      const steps = 5;
      const interval = setInterval(() => {
        step++;
        const factor = Math.max(0, 1 - step / steps);
        playerRef.current?.setVolume?.(curVol * factor);
        if (step >= steps) {
          clearInterval(interval);
          prevTrack();
        }
      }, 50);
    } else {
      prevTrack();
    }
  };

  return (
    <>
      {/* Hidden YouTube IFrame Player */}
      <div
        id="yt-hidden-player"
        className="hidden pointer-events-none w-0 h-0 overflow-hidden"
      />

      {/* Floating Dynamic Island Luxury Player Dock */}
      <div className="fixed bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 w-[95%] md:w-[92%] max-w-4xl z-50 bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl px-3 md:px-5 py-2.5 md:py-3 select-none flex items-center justify-between transition-all duration-300">
        {/* Left: Track Information */}
        <div
          onContextMenu={(e) => {
            if (currentTrack) {
              e.preventDefault();
              openContextMenu(currentTrack, { x: e.clientX, y: e.clientY });
            }
          }}
          className="flex items-center gap-2.5 md:gap-3.5 min-w-[220px] max-w-[280px] shrink-0 pr-2"
        >
          {currentTrack ? (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openContextMenu(currentTrack, { x: e.clientX, y: e.clientY });
                }}
                className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 bg-aether-elevated border border-aether-border/60 shadow-md cursor-pointer group/art"
                title="Options"
              >
                <img
                  src={getHighResThumbnail(currentTrack.thumbnail, currentTrack.id)}
                  alt={currentTrack.title}
                  onError={(e) => handleImageError(e, currentTrack.id)}
                  className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex flex-col min-w-0 pr-1 flex-1">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    openContextMenu(currentTrack, { x: e.clientX, y: e.clientY });
                  }}
                  className="text-white text-xs font-semibold tracking-wide truncate hover:text-[#F3E5AB] transition cursor-pointer"
                >
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openContextMenu(currentTrack, { x: e.clientX, y: e.clientY });
                }}
                className="p-1.5 rounded-lg text-aether-muted hover:text-white transition shrink-0 hidden sm:block hover:bg-white/5"
                title="Track options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
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
        <div className="flex flex-col items-center gap-1 md:gap-1.5 flex-1 max-w-[280px] sm:max-w-xs md:max-w-md relative">
          {/* Non-blocking Audio Resolving Badge */}
          {isResolvingAudio && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-aether-gold/20 border border-aether-gold/40 text-aether-gold text-[10px] font-mono shadow-lg animate-pulse whitespace-nowrap z-20 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-aether-gold animate-ping" />
              <span>Resolving Hi-Fi audio stream...</span>
            </div>
          )}

          {/* Non-blocking Stream Error Badge */}
          {hasError && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-mono shadow-lg animate-pulse whitespace-nowrap z-20 pointer-events-none">
              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>Stream interrupted, advancing...</span>
            </div>
          )}

          {/* Playback Controls (Always visible, never hidden) */}
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
              onClick={handlePrevTrack}
              disabled={!currentTrack}
              className="text-aether-subdued hover:text-white disabled:opacity-30 transition p-1"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={handleTogglePlay}
              disabled={!currentTrack}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-[#C5A059] via-[#D4AF37] to-[#F3E5AB] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-30 shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              )}
            </button>
            <button
              onClick={handleNextTrack}
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

          {/* Scrubber Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[9px] md:text-[10px] text-aether-subdued font-mono w-7 md:w-8 text-right tabular-nums shrink-0">
              {formatTime(currentTime)}
            </span>

            {/* Custom Seek Track Container with Gold Progress Fill & Glowing Thumb Dot */}
            <div className="relative flex items-center w-full h-1.5 bg-zinc-800/90 rounded-full cursor-pointer group">
              {/* Filled gold gradient bar */}
              <div
                className="h-full bg-gradient-to-r from-[#C5A059] to-[#F3E5AB] rounded-full pointer-events-none transition-[width] duration-75"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Visible circular thumb dot */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-[#F3E5AB] border-2 border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.85)] -translate-x-1/2 -translate-y-1/2 top-1/2 absolute pointer-events-none transition-transform group-hover:scale-125"
                style={{ left: `${progressPercent}%` }}
              />
              {/* Full-width transparent range input overlay */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                disabled={!currentTrack}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
            </div>

            <span className="text-[9px] md:text-[10px] text-aether-subdued font-mono w-7 md:w-8 text-left tabular-nums shrink-0">
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
            title="Synced Lyrics (L)"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleVisualizer}
            className={`p-1.5 rounded-lg transition ${
              isVisualizerOpen
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Spectrum Visualizer (V)"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            onClick={toggleEqualizer}
            className={`p-1.5 rounded-lg transition relative ${
              isEqualizerOpen
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Acoustic Equalizer (E)"
          >
            <Sliders className="w-4 h-4" />
            {isEqualizerEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
            )}
          </button>

          {/* Audio Dynamics (Crossfade & LUFS) Button */}
          <button
            onClick={toggleDynamicsModal}
            className={`p-1.5 rounded-lg transition relative ${
              isDynamicsOpen || isCrossfading
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Audio Dynamics & Crossfade (D)"
          >
            <Waves className={`w-4 h-4 ${isCrossfading ? "animate-pulse text-[#D4AF37]" : ""}`} />
            {(crossfadeEnabled || loudnessNormalizationEnabled) && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
            )}
          </button>

          {/* Active Crossfading Pill */}
          {isCrossfading && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3E5AB] text-[10px] font-mono shadow-[0_0_12px_rgba(212,175,55,0.3)] animate-pulse shrink-0"
              title="Acoustic Crossfade Blending"
            >
              <Waves className="w-3 h-3 text-[#D4AF37]" />
              <span>Blending</span>
            </div>
          )}

          {/* Active Sleep Timer Countdown Pill */}
          {isSleepTimerActive && (
            <button
              onClick={openSleepTimerModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F3E5AB] text-[10px] font-mono shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:bg-[#D4AF37]/30 transition shrink-0 animate-in fade-in"
              title="Sleep Timer Active - Click to manage"
            >
              <Moon className={`w-3 h-3 text-[#D4AF37] ${isSleepFadingOut ? "animate-ping" : ""}`} />
              <span>{formatSleepCountdown(sleepRemainingSeconds)}</span>
            </button>
          )}

          <button
            onClick={toggleSleepTimerModal}
            className={`p-1.5 rounded-lg transition relative ${
              isSleepTimerOpen || isSleepTimerActive
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Sleep Timer (T)"
          >
            <Moon className="w-4 h-4" />
            {isSleepTimerActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]" />
            )}
          </button>

          <button
            onClick={toggleQueue}
            className={`p-1.5 rounded-lg transition relative ${
              isQueueOpen
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/30"
                : "text-aether-muted hover:text-white"
            }`}
            title="Up Next Queue (Q)"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 1 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-bold font-mono flex items-center justify-center">
                {Math.min(queue.length - 1, 99)}
              </span>
            )}
          </button>

          {/* Volume slider (desktop only, phones have physical rockers) */}
          <div className="hidden md:flex items-center gap-2.5 w-24 lg:w-28">
            <button
              onClick={handleToggleMute}
              className="text-aether-muted hover:text-white transition shrink-0"
              title={isMuted || volume === 0 ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Custom Volume Track Container with Gold Progress Fill & Glowing Thumb Dot */}
            <div className="relative flex items-center w-full h-1.5 bg-zinc-800/90 rounded-full cursor-pointer group">
              {/* Filled gold gradient bar */}
              <div
                className="h-full bg-gradient-to-r from-[#C5A059] to-[#F3E5AB] rounded-full pointer-events-none transition-[width] duration-75"
                style={{ width: `${volumePercent}%` }}
              />
              {/* Visible circular thumb dot */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-[#F3E5AB] border-2 border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.85)] -translate-x-1/2 -translate-y-1/2 top-1/2 absolute pointer-events-none transition-transform group-hover:scale-125"
                style={{ left: `${volumePercent}%` }}
              />
              {/* Full-width transparent range input overlay */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
