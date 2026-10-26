"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Sparkles,
  Link2,
  FileText,
  UploadCloud,
  AlertCircle,
  Loader2,
  Disc,
  ArrowRight,
  Palette,
  Check,
  Music2,
  Search,
} from "lucide-react";
import { usePlaylistStore, PLAYLIST_GRADIENT_PRESETS } from "@/store/playlist-store";
import { useRouter } from "next/navigation";
import { Track } from "@/types/music";

interface ParsedItem {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
}

export function CreatePlaylistModal() {
  const {
    isCreateModalOpen,
    closeCreateModal,
    createPlaylist,
    importPlaylist,
    initialTab,
  } = usePlaylistStore();

  const router = useRouter();

  // Tab states
  const [mainTab, setMainTab] = useState<"create" | "import">("create");
  const [importSubTab, setImportSubTab] = useState<"url" | "file" | "text">("url");

  // Create Blank states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blankLoading, setBlankLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("gold");
  const [customCover, setCustomCover] = useState("");
  const [seedQuery, setSeedQuery] = useState("");
  const [seedResults, setSeedResults] = useState<Track[]>([]);
  const [seedTracks, setSeedTracks] = useState<Track[]>([]);
  const [isSearchingSeeds, setIsSearchingSeeds] = useState(false);

  // Import URL states
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  // Import File states
  const [file, setFile] = useState<File | null>(null);
  const [filePlaylistName, setFilePlaylistName] = useState("");
  const [parsedFileItems, setParsedFileItems] = useState<ParsedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Text states
  const [textInput, setTextInput] = useState("");
  const [textPlaylistName, setTextPlaylistName] = useState("");

  // Common Import / Progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Sync tab on open
  useEffect(() => {
    if (isCreateModalOpen) {
      setMainTab(initialTab || "create");
      setError(null);
      setWarning(null);
      setProgress(null);
      setIsProcessing(false);
      setUrlInput("");
      setFile(null);
      setParsedFileItems([]);
      setTextInput("");
      setTextPlaylistName("");
      setFilePlaylistName("");
      setCustomCover("");
      setSelectedPreset("gold");
      setSeedTracks([]);
      setSeedQuery("");
      setSeedResults([]);
      cancelRef.current = false;
    }
  }, [isCreateModalOpen, initialTab]);

  const searchSeedTracks = async (query: string) => {
    if (!query.trim()) {
      setSeedResults([]);
      return;
    }
    setIsSearchingSeeds(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSeedResults((data.tracks || []).slice(0, 4));
      }
    } catch {
      // silent
    } finally {
      setIsSearchingSeeds(false);
    }
  };

  if (!isCreateModalOpen) return null;

  // ---------------------------------------------------------------------------
  // Helper: Exportify CSV Parser
  // ---------------------------------------------------------------------------
  const parseCSV = (csvText: string): ParsedItem[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const res: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          res.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      res.push(cur.trim());
      return res;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    let trackIdx = headers.findIndex(
      (h) => h === "track name" || h === "title" || h === "song" || h === "track"
    );
    let artistIdx = headers.findIndex(
      (h) =>
        h === "artist name(s)" ||
        h === "artist name" ||
        h === "artist" ||
        h === "artists"
    );
    let albumIdx = headers.findIndex(
      (h) => h === "album name" || h === "album"
    );
    let durationIdx = headers.findIndex(
      (h) =>
        h.includes("duration (ms)") ||
        h.includes("duration ms") ||
        h === "duration"
    );

    if (trackIdx === -1) trackIdx = 0;
    if (artistIdx === -1) artistIdx = 1;

    const items: ParsedItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const title = cols[trackIdx];
      const artist = cols[artistIdx] || "Unknown Artist";
      const album = albumIdx !== -1 ? cols[albumIdx] : undefined;

      let duration = 210;
      let durationFormatted = "3:30";
      if (durationIdx !== -1 && cols[durationIdx]) {
        const parsedNum = Number(cols[durationIdx]);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          duration =
            parsedNum > 1000
              ? Math.round(parsedNum / 1000)
              : Math.round(parsedNum);
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          durationFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
        }
      }

      if (title && title.length > 0) {
        items.push({
          title,
          artist,
          album,
          duration,
          durationFormatted,
          thumbnail: "/branding/aether-logo.jpg",
        });
      }
    }
    return items;
  };

  // ---------------------------------------------------------------------------
  // Helper: M3U / TXT Parser
  // ---------------------------------------------------------------------------
  const parseM3UOrTxt = (text: string): ParsedItem[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const items: ParsedItem[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      let trackStr = "";
      if (line.startsWith("#EXTINF:")) {
        const commaIdx = line.indexOf(",");
        if (commaIdx !== -1) {
          trackStr = line.slice(commaIdx + 1).trim();
        }
      } else if (!line.startsWith("#")) {
        trackStr = line
          .replace(/^.*[\\/]/, "")
          .replace(/\.(mp3|flac|m4a|wav|aac|ogg|opus)$/i, "")
          .replace(/^\d+[\.\-\s]+/, "")
          .trim();
      }

      if (trackStr) {
        let artist = "Unknown Artist";
        let title = trackStr;
        if (trackStr.includes(" - ")) {
          const parts = trackStr.split(" - ");
          artist = parts[0].trim();
          title = parts.slice(1).join(" - ").trim();
        }
        items.push({
          title,
          artist,
          duration: 210,
          durationFormatted: "3:30",
          thumbnail: "/branding/aether-logo.jpg",
        });
      }
    }
    return items;
  };

  // ---------------------------------------------------------------------------
  // Instant Lazy Import for 25+ Compositions
  // ---------------------------------------------------------------------------
  const instantLazyImport = async (
    playlistName: string,
    items: ParsedItem[],
    coverUrl?: string
  ) => {
    setIsProcessing(true);
    setError(null);

    const tracks: Track[] = items.map((item, idx) => ({
      id: `pending:${idx}:${encodeURIComponent(`${item.title} ${item.artist}`.trim())}`,
      title: item.title,
      artist: item.artist || "Unknown Artist",
      album: item.album || "Single",
      duration: item.duration || 210,
      durationFormatted: item.durationFormatted || "3:30",
      thumbnail: item.thumbnail || coverUrl || "/branding/aether-logo.jpg",
    }));

    try {
      const finalName = playlistName.trim() || "Imported Collection";
      const newId = await importPlaylist(finalName, tracks, coverUrl);
      setIsProcessing(false);
      closeCreateModal();
      router.push(`/playlist/${newId}`);
    } catch (e: any) {
      setIsProcessing(false);
      setError(`Failed to save playlist: ${e?.message || "Unknown error"}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Batch Track Matcher for Small Lists (<= 25 items)
  // ---------------------------------------------------------------------------
  const matchAndImportBatch = async (
    playlistName: string,
    queries: string[],
    coverUrl?: string
  ) => {
    if (queries.length === 0) {
      setError("No compositions found to import.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: queries.length });
    setMatchedCount(0);
    cancelRef.current = false;

    const resolvedTracks: Track[] = [];
    const seenIds = new Set<string>();
    const batchSize = 4;

    for (let i = 0; i < queries.length; i += batchSize) {
      if (cancelRef.current) break;

      const currentBatch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        currentBatch.map(async (query) => {
          try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.tracks?.[0] || null;
          } catch {
            return null;
          }
        })
      );

      for (const t of batchResults) {
        if (t && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          resolvedTracks.push(t);
        }
      }

      setMatchedCount(resolvedTracks.length);
      setProgress({
        current: Math.min(i + batchSize, queries.length),
        total: queries.length,
      });
    }

    if (cancelRef.current) {
      setIsProcessing(false);
      setProgress(null);
      return;
    }

    if (resolvedTracks.length === 0) {
      setIsProcessing(false);
      setError("Could not match any compositions in the Aether catalog.");
      return;
    }

    try {
      const finalName = playlistName.trim() || "Imported Playlist";
      const newId = await importPlaylist(finalName, resolvedTracks, coverUrl);
      setIsProcessing(false);
      closeCreateModal();
      router.push(`/playlist/${newId}`);
    } catch (e: any) {
      setIsProcessing(false);
      setError(`Failed to save playlist: ${e?.message || "Unknown error"}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Form Submit Handlers
  // ---------------------------------------------------------------------------
  const handleBlankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setBlankLoading(true);
    const cover = customCover.trim() || `preset:${selectedPreset}`;
    const created = await createPlaylist(
      name.trim(),
      description.trim(),
      cover,
      seedTracks
    );
    setBlankLoading(false);

    if (created) {
      setName("");
      setDescription("");
      setCustomCover("");
      setSeedTracks([]);
      setSeedQuery("");
      setSeedResults([]);
      closeCreateModal();
      router.push(`/playlist/${created.id}`);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    setUrlLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      setUrlLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to parse playlist URL");
        return;
      }

      if (data.truncatedWarning) {
        setWarning(data.truncatedWarning);
      }

      if (!data.needsMatching && Array.isArray(data.tracks)) {
        // Direct YouTube tracks (up to 2,000 paginated tracks)
        setIsProcessing(true);
        const newId = await importPlaylist(data.name, data.tracks, data.coverUrl);
        setIsProcessing(false);
        closeCreateModal();
        router.push(`/playlist/${newId}`);
      } else if (data.needsMatching) {
        // Spotify / Deezer / Apple Music
        const items: ParsedItem[] = Array.isArray(data.items)
          ? data.items
          : (data.queries || []).map((q: string) => ({
              title: q,
              artist: "",
              duration: 210,
              durationFormatted: "3:30",
              thumbnail: data.coverUrl || "/branding/aether-logo.jpg",
            }));

        if (items.length > 25) {
          // Instant lazy-resolved import for 25+ tracks (e.g. 700 to 2,000 tracks)
          await instantLazyImport(data.name, items, data.coverUrl);
        } else {
          // Fast batch match for small lists
          await matchAndImportBatch(data.name, data.queries, data.coverUrl);
        }
      } else {
        setError("Invalid response format received from import service.");
      }
    } catch (err: any) {
      setUrlLoading(false);
      setError(err?.message || "An error occurred during import.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);

    const baseName = selected.name.replace(/\.[^/.]+$/, "");
    setFilePlaylistName(baseName);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      let items: ParsedItem[] = [];
      if (selected.name.endsWith(".csv")) {
        items = parseCSV(content);
      } else {
        items = parseM3UOrTxt(content);
      }
      setParsedFileItems(items);
    };
    reader.readAsText(selected);
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFileItems.length === 0) {
      setError("Please select a valid CSV, M3U, or TXT file with tracks.");
      return;
    }

    const playlistName =
      filePlaylistName || file?.name.replace(/\.[^/.]+$/, "") || "Exported Collection";

    if (parsedFileItems.length > 25) {
      // Instant lazy import for large lists (700 to 2,000+ tracks)
      await instantLazyImport(playlistName, parsedFileItems);
    } else {
      const queries = parsedFileItems.map((i) => `${i.title} ${i.artist}`.trim());
      await matchAndImportBatch(playlistName, queries);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseM3UOrTxt(textInput);

    if (items.length === 0) {
      setError("Please paste at least one composition line.");
      return;
    }

    const playlistName = textPlaylistName.trim() || "Imported Tracklist";

    if (items.length > 25) {
      // Instant lazy import for 25+ compositions
      await instantLazyImport(playlistName, items);
    } else {
      const queries = items.map((i) => `${i.title} ${i.artist}`.trim());
      await matchAndImportBatch(playlistName, queries);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-aether-surface border border-aether-gold/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeCreateModal}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-aether-elevated text-aether-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2 text-aether-gold text-[10px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audiophile Curation</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mainTab === "create" ? "Create New Playlist" : "Import Playlist"}
          </h2>
          <p className="text-aether-subdued text-xs">
            {mainTab === "create"
              ? "Assemble a private bespoke collection in your studio."
              : "Import 700 to 2,000+ tracklists instantly from Spotify, YouTube, Apple Music, Deezer, or CSV files."}
          </p>
        </div>

        {/* Top-Level Tabs (Create Blank vs Import) */}
        {!isProcessing && (
          <div className="flex items-center border-b border-aether-border/60 gap-6 mt-1">
            <button
              onClick={() => {
                setMainTab("create");
                setError(null);
              }}
              className={`flex items-center gap-2 pb-3 font-semibold text-xs uppercase tracking-wider transition-all relative ${
                mainTab === "create"
                  ? "text-aether-gold border-b-2 border-aether-gold"
                  : "text-aether-muted hover:text-white border-b-2 border-transparent"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Blank</span>
            </button>
            <button
              onClick={() => {
                setMainTab("import");
                setError(null);
              }}
              className={`flex items-center gap-2 pb-3 font-semibold text-xs uppercase tracking-wider transition-all relative ${
                mainTab === "import"
                  ? "text-aether-gold border-b-2 border-aether-gold"
                  : "text-aether-muted hover:text-white border-b-2 border-transparent"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Playlist</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Warning Alert */}
        {warning && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex flex-col gap-1">
              <span>{warning}</span>
              <button
                type="button"
                onClick={() => setImportSubTab("file")}
                className="text-aether-gold underline text-left font-medium hover:text-white"
              >
                Switch to Exportify CSV dropzone →
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Processing / Progress State                                       */}
        {/* ================================================================= */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-8 px-4 gap-5 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aether-gold/20 via-aether-gold/5 to-transparent border border-aether-gold/40 flex items-center justify-center text-aether-gold shadow-gold-glow animate-pulse">
                <Disc className="w-8 h-8 animate-spin text-aether-gold" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-w-sm">
              <h3 className="text-base font-bold text-white tracking-tight">
                {progress ? "Matching Compositions" : "Assembling Playlist"}
              </h3>
              <p className="text-aether-subdued text-xs">
                {progress
                  ? "Searching Aether catalog with high-fidelity 24-bit audio matching..."
                  : "Creating instant collection and queueing background audio sync..."}
              </p>
            </div>

            {progress && (
              <div className="w-full max-w-md flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-aether-muted">
                  <span className="text-aether-gold">
                    Importing & matching: {progress.current} / {progress.total}
                  </span>
                  <span>
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-aether-gold-muted via-aether-gold to-aether-gold-hover transition-all duration-200"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-aether-subdued">
                  <span>{matchedCount} matched compositions</span>
                  <button
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    className="text-rose-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* Tab 1: Create Blank Form                                          */}
        {/* ================================================================= */}
        {!isProcessing && mainTab === "create" && (
          <form onSubmit={handleBlankSubmit} className="flex flex-col gap-4">
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
                className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Atmospheric soundscapes for focus and nocturnal sessions..."
                className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition resize-none"
              />
            </div>

            {/* Artwork Theme Selection */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Artwork Theme</span>
                </span>
                <span className="text-zinc-500">6 Luxury Presets</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLAYLIST_GRADIENT_PRESETS.map((preset) => {
                  const isSelected =
                    !customCover && selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        setCustomCover("");
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                        isSelected
                          ? "border-[#D4AF37] bg-white/5 shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                          : "border-aether-border/50 hover:border-zinc-500 bg-aether-dark/60"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg shrink-0 bg-gradient-to-br ${preset.css} border border-white/20 flex items-center justify-center`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white drop-shadow" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-300 truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Image URL fallback */}
              <input
                type="url"
                value={customCover}
                onChange={(e) => setCustomCover(e.target.value)}
                placeholder="Or paste custom cover image URL (https://...)"
                className="w-full bg-aether-dark/60 border border-aether-border/50 rounded-xl text-white text-[11px] px-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-aether-gold transition mt-1"
              />
            </div>

            {/* Seed Compositions Search */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                <span className="flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Seed Tracks (Optional)</span>
                </span>
                {seedTracks.length > 0 && (
                  <span className="text-aether-gold font-bold">
                    {seedTracks.length} selected
                  </span>
                )}
              </div>

              {/* Selected Seed Pills */}
              {seedTracks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-aether-dark/60 rounded-xl border border-aether-border/40">
                  {seedTracks.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F3E5AB] text-[11px]"
                    >
                      <span className="truncate max-w-[150px]">{t.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSeedTracks((prev) =>
                            prev.filter((item) => item.id !== t.id)
                          )
                        }
                        className="hover:text-red-400 text-zinc-400 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={seedQuery}
                  onChange={(e) => {
                    setSeedQuery(e.target.value);
                    searchSeedTracks(e.target.value);
                  }}
                  placeholder="Search catalog to add initial tracks..."
                  className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs pl-8 pr-3 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold transition"
                />
              </div>

              {/* Quick Results */}
              {seedResults.length > 0 && (
                <div className="flex flex-col gap-1 bg-aether-dark/90 border border-aether-border/60 rounded-xl p-1.5 max-h-36 overflow-y-auto">
                  {seedResults.map((track) => {
                    const alreadyAdded = seedTracks.some(
                      (t) => t.id === track.id
                    );
                    return (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-white text-xs truncate">
                            {track.title}
                          </span>
                          <span className="text-zinc-500 text-[10px] truncate">
                            {track.artist}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => {
                            setSeedTracks((prev) => [...prev, track]);
                            setSeedQuery("");
                            setSeedResults([]);
                          }}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                            alreadyAdded
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                          }`}
                        >
                          {alreadyAdded ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={blankLoading || !name.trim()}
              className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {blankLoading ? (
                <span className="animate-pulse">Creating Collection...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-black" />
                  <span>
                    {seedTracks.length > 0
                      ? `Create Playlist with ${seedTracks.length} Track${seedTracks.length === 1 ? "" : "s"}`
                      : "Create Playlist"}
                  </span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* Tab 2: Import Playlist Form                                       */}
        {/* ================================================================= */}
        {!isProcessing && mainTab === "import" && (
          <div className="flex flex-col gap-4">
            {/* Import Sub-Option Selector */}
            <div className="grid grid-cols-3 gap-2 bg-aether-dark/80 p-1 rounded-2xl border border-aether-border/60">
              <button
                type="button"
                onClick={() => {
                  setImportSubTab("url");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium transition ${
                  importSubTab === "url"
                    ? "bg-aether-surface text-aether-gold border border-aether-gold/30 shadow-sm"
                    : "text-aether-muted hover:text-white"
                }`}
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">URL Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportSubTab("file");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium transition ${
                  importSubTab === "file"
                    ? "bg-aether-surface text-aether-gold border border-aether-gold/30 shadow-sm"
                    : "text-aether-muted hover:text-white"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">CSV / M3U</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportSubTab("text");
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium transition ${
                  importSubTab === "text"
                    ? "bg-aether-surface text-aether-gold border border-aether-gold/30 shadow-sm"
                    : "text-aether-muted hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tracklist</span>
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Sub-option A: URL Input                                        */}
            {/* ------------------------------------------------------------- */}
            {importSubTab === "url" && (
              <form onSubmit={handleUrlImport} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                    <span>Supported Platforms</span>
                    <span className="text-aether-gold">Up to 2,000 Tracks</span>
                  </div>
                  {/* Platform Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      YouTube / Music
                    </span>
                    <span className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Spotify
                    </span>
                    <span className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      Apple Music
                    </span>
                    <span className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Deezer
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                    Paste Playlist Web Link
                  </label>
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/... or youtube.com/playlist?list=..."
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-3 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={urlLoading || !urlInput.trim()}
                  className="flex items-center justify-center gap-2 w-full mt-2 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {urlLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Parsing Playlist...</span>
                    </span>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 text-black" />
                      <span>Fetch & Import Playlist</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Sub-option B: File Dropzone                                    */}
            {/* ------------------------------------------------------------- */}
            {importSubTab === "file" && (
              <form onSubmit={handleFileSubmit} className="flex flex-col gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.m3u,.m3u8,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                  <span>Direct File Ingestion</span>
                  <span className="text-aether-gold">Unlimited 1,000+ Compositions</span>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-aether-border/70 hover:border-aether-gold/70 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 bg-aether-dark/40 hover:bg-aether-dark/70"
                >
                  <div className="w-12 h-12 rounded-xl bg-aether-surface border border-aether-gold/30 flex items-center justify-center text-aether-gold">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white text-xs font-semibold">
                      {file ? file.name : "Click or drop Exportify CSV / .M3U file"}
                    </span>
                    <span className="text-aether-muted text-[10px]">
                      Supports Exportify CSV (Track Name, Artist, Album, Duration), .m3u, .txt
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-aether-subdued px-1">
                  <span>
                    Tip: Export any Spotify playlist with 1,000+ songs via{" "}
                    <a
                      href="https://exportify.net"
                      target="_blank"
                      rel="noreferrer"
                      className="text-aether-gold underline hover:text-white"
                    >
                      exportify.net
                    </a>{" "}
                    (1-click free CSV export)
                  </span>
                </div>

                {parsedFileItems.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-aether-gold font-mono text-[11px]">
                        ✓ {parsedFileItems.length} compositions detected (Instant 1-Click Import)
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                        Playlist Name
                      </label>
                      <input
                        type="text"
                        value={filePlaylistName}
                        onChange={(e) => setFilePlaylistName(e.target.value)}
                        placeholder="Exported Collection"
                        className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 w-full mt-1 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <ArrowRight className="w-4 h-4 text-black" />
                      <span>
                        Import {parsedFileItems.length} Compositions Instantly
                      </span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Sub-option C: Plain Text Tracklist                             */}
            {/* ------------------------------------------------------------- */}
            {importSubTab === "text" && (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                    Playlist Title
                  </label>
                  <input
                    type="text"
                    value={textPlaylistName}
                    onChange={(e) => setTextPlaylistName(e.target.value)}
                    placeholder="e.g. My Vinyl Favorites"
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-aether-muted uppercase tracking-widest pl-1">
                    <span>Paste Compositions (One per line)</span>
                    <span className="text-aether-gold">
                      {textInput.split(/\r?\n/).filter((l) => l.trim()).length} lines
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Daft Punk - Get Lucky\nThe Weeknd - Blinding Lights\nFleetwood Mac - Dreams\nRadiohead - Weird Fishes`}
                    className="w-full bg-aether-dark border border-aether-border/60 rounded-xl text-white text-xs px-3.5 py-2.5 placeholder-aether-muted focus:outline-none focus:border-aether-gold focus:ring-1 focus:ring-aether-gold/40 transition resize-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="flex items-center justify-center gap-2 w-full mt-1 bg-gradient-to-r from-aether-gold-hover via-aether-gold to-aether-gold-muted text-black font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4 text-black" />
                  <span>Parse & Import Compositions Instantly</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
