"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Bookmark, Radio, Disc3 } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

export function Sidebar() {
  const pathname = usePathname();
  const likedCount = usePlayerStore((state) => state.likedTrackIds.length);

  return (
    <aside className="w-64 bg-aether-dark/95 border border-aether-border/40 rounded-2xl flex flex-col p-4 select-none justify-between shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 px-2 pt-2">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-gold-glow border border-aether-gold/30 bg-aether-elevated shrink-0">
            <img
              src="/branding/aether-logo.jpg"
              alt="Aether"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-base tracking-[0.25em] uppercase">
              Aether
            </span>
            <span className="text-[10px] text-aether-gold font-mono tracking-widest uppercase">
              Hi-Fi Studio
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-1.5 pt-2">
          <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em] px-3 mb-1">
            Menu
          </span>
          <Link
            href="/"
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all duration-200 ${
              pathname === "/"
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/20 shadow-sm"
                : "text-aether-subdued hover:text-white hover:bg-aether-elevated/60"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Discover</span>
          </Link>
          <Link
            href="/search"
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all duration-200 ${
              pathname === "/search"
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/20 shadow-sm"
                : "text-aether-subdued hover:text-white hover:bg-aether-elevated/60"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Link>
        </nav>

        {/* Collection Section */}
        <div className="flex flex-col gap-1.5 pt-2">
          <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em] px-3 mb-1">
            Library
          </span>
          <Link
            href="/collection/tracks"
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs tracking-wider transition-all duration-200 ${
              pathname === "/collection/tracks"
                ? "text-aether-gold bg-aether-gold-glow border border-aether-gold/20 shadow-sm"
                : "text-aether-subdued hover:text-white hover:bg-aether-elevated/60"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <Bookmark className="w-4 h-4" />
              <span>Vault</span>
            </div>
            {likedCount > 0 && (
              <span className="text-[10px] font-mono bg-aether-elevated px-2 py-0.5 rounded-full border border-aether-border/60 text-aether-gold">
                {likedCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Audio Engine Specs Card */}
      <div className="p-3.5 rounded-xl bg-aether-surface/60 border border-aether-border/50 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-aether-text">
            <Radio className="w-3.5 h-3.5 text-aether-gold animate-pulse" />
            <span className="font-semibold tracking-wide">Audio Engine</span>
          </div>
          <span className="text-[9px] font-mono text-aether-gold bg-aether-gold/10 px-1.5 py-0.5 rounded border border-aether-gold/20">
            24-BIT
          </span>
        </div>
        <p className="text-[10px] text-aether-subdued leading-relaxed">
          Zero-storage on-demand proxy with lossless byte-range seeking.
        </p>
      </div>
    </aside>
  );
}
