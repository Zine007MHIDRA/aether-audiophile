"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Cloud,
  Check,
  Download,
  Copy,
  Trash2,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";
import {
  usePlaylistStore,
  PLAYLIST_GRADIENT_PRESETS,
} from "@/store/playlist-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

export function EditPlaylistModal() {
  const {
    isEditModalOpen,
    activeEditPlaylist,
    closeEditModal,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    exportPlaylist,
    syncAllLocalPlaylistsToCloud,
  } = usePlaylistStore();

  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("gold");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeEditPlaylist) {
      setName(activeEditPlaylist.name || "");
      setDescription(activeEditPlaylist.description || "");
      const existingCover = activeEditPlaylist.coverUrl || "";
      setCoverUrl(existingCover);

      if (existingCover.startsWith("preset:")) {
        setSelectedPresetId(existingCover.replace("preset:", ""));
      } else {
        setSelectedPresetId("");
      }
    }
  }, [activeEditPlaylist]);

  if (!isEditModalOpen || !activeEditPlaylist) return null;

  const isLocal = activeEditPlaylist.id.startsWith("local-pl-");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const finalCover = selectedPresetId
      ? `preset:${selectedPresetId}`
      : coverUrl.trim();

    await updatePlaylist(activeEditPlaylist.id, {
      name: name.trim(),
      description: description.trim(),
      coverUrl: finalCover || undefined,
    });
    setIsSaving(false);
  };

  const handleDuplicate = async () => {
    const newId = await duplicatePlaylist(activeEditPlaylist.id);
    closeEditModal();
    if (newId) {
      router.push(`/playlist/${newId}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${activeEditPlaylist.name}"?`)) return;
    await deletePlaylist(activeEditPlaylist.id);
    closeEditModal();
    router.push("/");
  };

  const handleCloudSync = async () => {
    await syncAllLocalPlaylistsToCloud();
  };

  // Find active preset gradient CSS
  const activeGradient = PLAYLIST_GRADIENT_PRESETS.find(
    (p) => p.id === selectedPresetId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeEditModal}
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(212,175,55,0.2)] p-6 select-none animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  Edit Collection
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40 font-bold uppercase">
                  {isLocal ? "Local Vault" : "Cloud Synced"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Customize title, description, luxury artwork & sync settings
              </p>
            </div>
          </div>

          <button
            onClick={closeEditModal}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="py-4 space-y-4 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Collection Name <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Vinyl Masterpieces"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
            />
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Description / Acoustic Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add acoustic curation notes or context for this playlist..."
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition resize-none"
            />
          </div>

          {/* Artwork Direction: Gradient Presets */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                Artwork Theme
              </label>
              <span className="text-[10px] font-mono text-zinc-500">6 Curated Styles</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PLAYLIST_GRADIENT_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setCoverUrl("");
                    }}
                    className={`h-14 rounded-xl relative p-2 text-left overflow-hidden border transition flex flex-col justify-between bg-gradient-to-br ${preset.css} ${
                      isSelected
                        ? "border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                        : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-mono text-white/80 font-bold uppercase">
                        {preset.badge}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </div>
                    <span className="text-[10px] font-semibold text-white drop-shadow">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Image URL fallback */}
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => {
                    setCoverUrl(e.target.value);
                    if (e.target.value) setSelectedPresetId("");
                  }}
                  placeholder="Or paste custom image artwork URL (https://...)"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions & Utilities */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              Collection Utilities
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => exportPlaylist(activeEditPlaylist.id, "m3u")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                Export .M3U8
              </button>

              <button
                type="button"
                onClick={() => exportPlaylist(activeEditPlaylist.id, "json")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#F3E5AB]" />
                Export .JSON
              </button>

              <button
                type="button"
                onClick={handleDuplicate}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                Duplicate Playlist
              </button>

              {isLocal && isSupabaseConfigured() && user ? (
                <button
                  type="button"
                  onClick={handleCloudSync}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs text-[#F3E5AB] hover:bg-[#D4AF37]/25 transition"
                >
                  <Cloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Sync to Cloud
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Delete Playlist
                </button>
              )}
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-6 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C280] disabled:opacity-40 text-black font-semibold text-xs transition shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-2"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
