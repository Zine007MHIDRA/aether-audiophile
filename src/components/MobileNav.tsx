"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Bookmark, User, LogIn, LogOut } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { useAuthStore } from "@/store/auth-store";

export function MobileNav() {
  const pathname = usePathname();
  const likedCount = usePlayerStore((state) => state.likedTrackIds.length);
  const { user, openAuthModal, signOut } = useAuthStore();

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-aether-dark/95 border-b border-aether-border/40 backdrop-blur-xl shrink-0 z-30 select-none">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-aether-gold/30 bg-aether-elevated shrink-0">
          <img
            src="/branding/aether-logo.jpg"
            alt="Aether"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-extrabold text-xs tracking-[0.2em] uppercase">
          Aether
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        <Link
          href="/"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
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
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
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
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition relative ${
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

        {user ? (
          <div className="flex items-center gap-1.5 bg-aether-surface/80 border border-aether-gold/30 px-2 py-1 rounded-lg">
            <span className="text-white text-[10px] font-semibold max-w-[75px] truncate">
              {user.email?.split("@")[0]}
            </span>
            <button
              onClick={signOut}
              className="p-1 text-aether-muted hover:text-rose-400 rounded transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-aether-gold hover:bg-aether-elevated transition border border-aether-gold/30"
            title="Sign In"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join</span>
          </button>
        )}
      </nav>
    </header>
  );
}
