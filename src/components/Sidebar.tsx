"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Bookmark, Plus, ListMusic, User, LogOut, LogIn } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import { useAuthStore } from "@/store/auth-store";
import { usePlaylistStore } from "@/store/playlist-store";

export function Sidebar() {
  const pathname = usePathname();
  const likedCount = usePlayerStore((state) => state.likedTrackIds.length);
  const { user, openAuthModal, signOut, initAuth } = useAuthStore();
  const { playlists, openCreateModal, fetchPlaylists } = usePlaylistStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user, fetchPlaylists]);

  return (
    <aside className="hidden md:flex w-64 bg-aether-dark/95 border border-aether-border/40 rounded-2xl flex-col p-4 select-none justify-between shadow-2xl backdrop-blur-xl shrink-0">
      <div className="flex flex-col gap-6 overflow-hidden">
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
        <nav className="flex flex-col gap-1.5">
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
        </nav>

        {/* Playlists Section */}
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3">
            <span className="text-[10px] font-semibold text-aether-muted uppercase tracking-[0.2em]">
              Playlists
            </span>
            <button
              onClick={openCreateModal}
              className="p-1 rounded-md text-aether-subdued hover:text-aether-gold hover:bg-aether-elevated transition"
              title="Create New Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-48 pr-1">
            {playlists.length === 0 ? (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-aether-muted hover:text-aether-gold hover:bg-aether-elevated/40 transition text-left"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">New Playlist...</span>
              </button>
            ) : (
              playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs truncate transition ${
                    pathname === `/playlist/${pl.id}`
                      ? "text-aether-gold bg-aether-gold-glow/40 border border-aether-gold/20"
                      : "text-aether-subdued hover:text-white hover:bg-aether-elevated/50"
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{pl.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Auth Section */}
      <div className="pt-3 border-t border-aether-border/40">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-aether-surface/60 border border-aether-border/50">
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="w-7 h-7 rounded-lg bg-aether-gold/15 border border-aether-gold/30 flex items-center justify-center text-aether-gold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-[11px] font-semibold truncate">
                  {user.email?.split("@")[0]}
                </span>
                <span className="text-[9px] text-aether-gold font-mono truncate">
                  Cloud Active
                </span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-aether-muted hover:text-rose-400 rounded-lg hover:bg-aether-elevated transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-aether-surface hover:bg-aether-elevated border border-aether-gold/30 hover:border-aether-gold text-aether-gold font-medium text-xs tracking-wider transition shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Join</span>
          </button>
        )}
      </div>
    </aside>
  );
}
