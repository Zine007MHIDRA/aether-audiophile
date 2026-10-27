# Aether — Audiophile Music Player

A luxury, zero-storage music streaming application and desktop client built with Next.js 14, Electron, Tailwind CSS, Zustand, and YouTube Music via Innertube.

[![Windows Release](https://img.shields.io/badge/Windows-Download%20.exe-E6C280?style=for-the-badge&logo=windows&logoColor=060709)](https://github.com/Zine007MHIDRA/aether-audiophile/releases/latest/download/Aether-1.0.0-Portable.exe)
[![GitHub Release](https://img.shields.io/github/v/release/Zine007MHIDRA/aether-audiophile?style=for-the-badge&color=D4AF37)](https://github.com/Zine007MHIDRA/aether-audiophile/releases/latest)

---

## 💾 Download for Windows Desktop

You can download the standalone portable executable directly from GitHub Releases:

- **[Download Aether-1.0.0-Portable.exe](https://github.com/Zine007MHIDRA/aether-audiophile/releases/latest/download/Aether-1.0.0-Portable.exe)** *(174 MB, No installation needed)*
- **[View All Releases & Changelog](https://github.com/Zine007MHIDRA/aether-audiophile/releases)**

Just double-click `Aether-1.0.0-Portable.exe` to run.

---

## ✨ Features

- **Dual Audio Engine**: Embedded Chromium playback engine paired with an automatic seamless fallback to lossless native direct streaming (`/api/stream`) with HTTP 206 byte-range seeking.
- **Acoustic Loudness Normalization**: Real-time LUFS estimation and loudness leveling (-14 LUFS target) with peak limiter headroom.
- **Dynamic Crossfade**: Smooth volume crossfade blending between consecutive tracks.
- **Real-time Synced Lyrics**: Synchronized scrolling lyrics powered by LRCLIB with instant time-seek jumping.
- **Studio Spectrum Visualizer**: High-FPS frequency spectrum visualizer (bars, wave, radial modes).
- **10-Band Graphic Equalizer**: Preamp gain and parametric frequency band customization.
- **Sleep Timer with Micro-fade**: Gentle volume fade-out timer.
- **Windows System Media Integration**: Global media keys (`Play/Pause`, `Next`, `Previous`) and taskbar tray controls.
- **Obsidian & Gold Design**: Bespoke luxury dark theme with glassmorphic floating player island.

---

## 🛠️ Getting Started (Web & Dev)

### 1. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Build Desktop Executable
```bash
# Standalone Portable .exe
npm run dist:win:portable

# Windows NSIS Installer
npm run dist:win
```

Output binaries will be generated inside the `dist/` directory.

---

## 📐 Architecture
- `electron/main.js`: Electron desktop process with embedded Next.js server, tray, global shortcuts, and media security policies.
- `src/lib/youtube.ts`: Innertube client singleton.
- `src/app/api/stream/route.ts`: On-demand lossless audio stream proxy with byte-range seek support.
- `src/app/api/search/route.ts`: Instant search endpoint for tracks, albums, and artists.
- `src/app/api/lyrics/route.ts`: Synchronized LRC lyrics engine.
- `src/store/player-store.ts`: Zustand store managing playback queue, volume, repeat, shuffle, and vault tracks.
- `src/store/audio-dynamics-store.ts`: Zustand store managing crossfade blending and LUFS loudness normalization.
