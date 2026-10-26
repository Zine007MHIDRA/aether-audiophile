import { NextResponse } from "next/server";
import { getInnertube, getHighResThumbnail } from "@/lib/youtube";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const yt = await getInnertube();
    const tracks: Track[] = [];

    // Search for top trending studio songs
    let songs: any[] = [];
    try {
      const results = await yt.music.search("Top Hits Global", { type: "song" });
      songs = (results.songs?.contents || results.contents || []) as any[];
    } catch {
      // Fallback query if needed
      const fallbackResults = await yt.music.search("Hit Songs", { type: "song" });
      songs = (fallbackResults.songs?.contents || fallbackResults.contents || []) as any[];
    }

    const seenIds = new Set<string>();

    for (const item of songs) {
      if (!item.id || seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      const durationSec = item.duration?.seconds || 0;
      const durationFormatted = item.duration?.text || "3:30";
      const artistName =
        item.artists?.[0]?.name || item.author?.name || "Popular Artist";

      // Select highest resolution thumbnail candidate and upgrade with getHighResThumbnail
      const rawThumbnail =
        item.thumbnails?.[0]?.url ||
        item.thumbnails?.[item.thumbnails.length - 1]?.url;

      const thumbnail = getHighResThumbnail(rawThumbnail, item.id);

      tracks.push({
        id: item.id,
        title:
          typeof item.title === "string"
            ? item.title
            : item.title?.text || item.name || "Track",
        artist: artistName,
        album: item.album?.name || undefined,
        duration: durationSec,
        durationFormatted,
        thumbnail,
      });

      if (tracks.length >= 25) break;
    }

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error("Home feed error:", error);
    return NextResponse.json({ tracks: [] });
  }
}
