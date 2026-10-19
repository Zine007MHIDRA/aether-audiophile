import { NextRequest, NextResponse } from "next/server";
import { getInnertube } from "@/lib/youtube";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query 'q'" }, { status: 400 });
  }

  try {
    const yt = await getInnertube();
    const tracks: Track[] = [];

    try {
      const musicResults = await yt.music.search(query, { type: "song" });
      const songs = (musicResults.songs?.contents || musicResults.contents || []) as any[];

      for (const item of songs) {
        if (!item.id) continue;

        const durationSec = item.duration?.seconds || 0;
        const durationFormatted = item.duration?.text || "3:30";
        const artistName = item.artists?.[0]?.name || item.author?.name || "Various Artists";
        const thumbnail =
          item.thumbnails?.[item.thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

        tracks.push({
          id: item.id,
          title: typeof item.title === "string" ? item.title : item.title?.text || item.name || "Unknown",
          artist: artistName,
          album: item.album?.name || undefined,
          duration: durationSec,
          durationFormatted,
          thumbnail,
        });
      }
    } catch (e) {
      console.warn("Music search failed, falling back to video search:", e);
    }

    // Fallback if music search was empty
    if (tracks.length === 0) {
      const videoResults = await yt.search(query, { type: "video" });
      const videos = (videoResults.videos || []) as any[];

      for (const item of videos) {
        if (!item.id) continue;
        tracks.push({
          id: item.id,
          title: item.title?.text || "Unknown",
          artist: item.author?.name || "Unknown",
          duration: item.duration?.seconds || 0,
          durationFormatted: item.duration?.text || "3:00",
          thumbnail: item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        });
      }
    }

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: error?.message || "Search failed" },
      { status: 500 }
    );
  }
}
