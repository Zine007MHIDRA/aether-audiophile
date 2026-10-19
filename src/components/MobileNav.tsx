"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Bookmark } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

export function MobileNav() {
  const pathname = usePathname();
  const likedCount = usePlayerStore((state) => state.likedTrackIds.length);

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-aether-dark/95 border-b border-aether-border/40 backdrop-blur-xl shrink-0 z-30 select-none">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-aether-gold/30 bg-aether-elevated shrink-0">
          <img
            src="/branding/aether-logo.jpg"
            alt="Aether"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-extrabold text-sm tracking-[0.2em] uppercase">
          Aether
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        <Link
          href="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            pathname === "/"
              ? "text-aether-gold bg-aether-gold-glow"
              : "text-aether-subdued hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Discover</span>
        </Link>
        <Link
          href="/search"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            pathname === "/search"
              ? "text-aether-gold bg-aether-gold-glow"
              : "text-aether-subdued hover:text-white"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </Link>
        <Link
          href="/collection/tracks"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition relative ${
            pathname === "/collection/tracks"
              ? "text-aether-gold bg-aether-gold-glow"
              : "text-aether-subdued hover:text-white"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Vault</span>
          {likedCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-aether-gold" />
          )}
        </Link>
      </nav>
    </header>
  );
}
