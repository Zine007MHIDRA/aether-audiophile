"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Heart, Music2, Plus } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

export function Sidebar() {
  const pathname = usePathname();
  const likedCount = usePlayerStore((state) => state.likedTrackIds.length);

  return (
    <aside className="w-64 bg-spotify-black flex flex-col gap-2 p-2 h-full select-none">
      {/* Top Navigation */}
      <div className="bg-spotify-dark rounded-lg p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-2 text-white font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center text-black">
            <Music2 className="w-5 h-5 fill-current" />
          </div>
          <span>Spotify <span className="text-xs text-spotify-green uppercase tracking-widest font-normal">Self</span></span>
        </div>

        <nav className="flex flex-col gap-1 mt-2">
          <Link
            href="/"
            className={`flex items-center gap-4 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              pathname === "/"
                ? "text-white bg-spotify-highlight"
                : "text-spotify-subdued hover:text-white"
            }`}
          >
            <Home className="w-6 h-6" />
            <span>Home</span>
          </Link>
          <Link
            href="/search"
            className={`flex items-center gap-4 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              pathname === "/search"
                ? "text-white bg-spotify-highlight"
                : "text-spotify-subdued hover:text-white"
            }`}
          >
            <Search className="w-6 h-6" />
            <span>Search</span>
          </Link>
        </nav>
      </div>

      {/* Library Section */}
      <div className="bg-spotify-dark rounded-lg flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between px-2 text-spotify-subdued hover:text-white cursor-pointer transition">
          <div className="flex items-center gap-3">
            <Library className="w-6 h-6" />
            <span className="font-semibold text-sm">Your Library</span>
          </div>
          <button className="p-1 hover:bg-spotify-highlight rounded-full transition" title="Create Playlist">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Liked Songs Entry */}
        <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2">
          <Link
            href="/collection/tracks"
            className={`flex items-center gap-3 p-2 rounded-md hover:bg-spotify-highlight/50 transition cursor-pointer ${
              pathname === "/collection/tracks" ? "bg-spotify-highlight" : ""
            }`}
          >
            <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 to-purple-400 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-medium truncate">Liked Songs</span>
              <span className="text-spotify-subdued text-xs">
                {likedCount} {likedCount === 1 ? "song" : "songs"}
              </span>
            </div>
          </Link>

          {/* Quick links / playlists */}
          <div className="mt-4 border-t border-spotify-highlight pt-3 flex flex-col gap-2">
            <span className="text-xs font-semibold text-spotify-subdued uppercase tracking-wider px-2">
              Streaming Engine
            </span>
            <div className="px-2 text-xs text-spotify-subdued/80 leading-relaxed">
              Zero storage used. Audio streamed directly on demand.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
