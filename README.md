# Spotify Self-Hosted / Web Player

A modern, zero-storage music streaming web application built with Next.js 14, Tailwind CSS, Zustand, and YouTube Music via `youtubei.js`.

## Features
- **Zero Local/Cloud Audio Storage**: Streams tracks dynamically on-demand with HTTP 206 partial content range support.
- **Full Global Catalog**: Instant search across millions of tracks, albums, and artists.
- **Spotify Dark Theme**: 1:1 authentic Spotify desktop/web layout.
- **Persistent Audio Context**: Bottom player stays active seamlessly while navigating pages.
- **Synced Lyrics View**: Real-time synchronized scrolling lyrics powered by LRCLIB.
- **Web Media Session API**: Control playback from OS lock-screen, hardware media keys, and Bluetooth devices.
- **Vercel & PWA Ready**: Deployable to Vercel in one click.

## Getting Started

### 1. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 2. Deploy to Vercel
1. Push this repository to a private GitHub repository:
   ```bash
   git add .
   git commit -m "feat: complete spotify web player"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. Import the repository in [Vercel](https://vercel.com) and hit **Deploy**.

## Architecture
- `src/lib/youtube.ts`: Innertube client singleton.
- `src/app/api/search/route.ts`: Instant search endpoint for songs and artists.
- `src/app/api/stream/route.ts`: On-demand audio stream proxy with byte-range seek support.
- `src/app/api/lyrics/route.ts`: LRC synchronized lyrics resolver.
- `src/store/player-store.ts`: Zustand store managing playback queue, volume, repeat, shuffle, and favorites.
