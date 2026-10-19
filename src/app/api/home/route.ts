import { NextResponse } from "next/server";
import { getInnertube } from "@/lib/youtube";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const yt = await getInnertube();
    const tracks: Track[] = [];

    // Search for top trending music
    const results = await yt.music.search("Today's Top Hits", { type: "song" });
    const songs = (results.songs?.contents || results.contents || []) as any[];

    for (const item of songs.slice(0, 20)) {
      if (!item.id) continue;
      const durationSec = item.duration?.seconds || 0;
      const durationFormatted = item.duration?.text || "3:30";
      const artistName = item.artists?.[0]?.name || item.author?.name || "Popular Artist";
      const thumbnail =
        item.thumbnails?.[item.thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

      tracks.push({
        id: item.id,
        title: typeof item.title === "string" ? item.title : item.title?.text || item.name || "Track",
        artist: artistName,
        album: item.album?.name || undefined,
        duration: durationSec,
        durationFormatted,
        thumbnail,
      });
    }

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error("Home feed error:", error);
    return NextResponse.json({ tracks: [] });
  }
}
