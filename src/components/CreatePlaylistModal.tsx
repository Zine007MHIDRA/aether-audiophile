"use client";

import React, { useState } from "react";
import { X, Plus, Music, Sparkles } from "lucide-react";
import { usePlaylistStore } from "@/store/playlist-store";
import { useRouter } from "next/navigation";

export function CreatePlaylistModal() {
  const { isCreateModalOpen, closeCreateModal, createPlaylist } = usePlaylistStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const created = await createPlaylist(name.trim(), description.trim());
    setLoading(false);

    if (created) {
      setName("");
      setDescription("");
      router.push(`/playlist/${created.id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-aether-surface border border-aether-gold/30 rounded-3xl p-7 shadow-2xl relative flex flex-col gap-5">
        <button
          onClick={closeCreateModal}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-aether-elevated text-aether-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curate Collection</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Create Playlist
          </h2>
          <p className="text-aether-subdued text-xs">
            Assemble your own private tracklist in the Aether cloud.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
              Playlist Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Nocturne"
              className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Atmospheric soundscapes for focus and nocturnal sessions..."
              className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Creating...</span>
            ) : (
              <>
                <Plus className="w-4 h-4 text-black" />
                <span>Create Playlist</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
