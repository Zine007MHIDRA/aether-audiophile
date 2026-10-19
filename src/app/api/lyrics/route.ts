import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const track = req.nextUrl.searchParams.get("track");
  const artist = req.nextUrl.searchParams.get("artist");

  if (!track || !artist) {
    return NextResponse.json(
      { error: "track and artist are required" },
      { status: 400 }
    );
  }

  try {
    const cleanTrack = track
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/ft\..*$/i, "")
      .replace(/feat\..*$/i, "")
      .trim();

    const cleanArtist = artist.split(",")[0].trim();

    const url = new URL("https://lrclib.net/api/get");
    url.searchParams.set("track_name", cleanTrack);
    url.searchParams.set("artist_name", cleanArtist);

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ValiantMusicPlayer/1.0 (https://github.com/valiant)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ found: false });
    }

    const data = await res.json();
    return NextResponse.json({
      found: true,
      plainLyrics: data.plainLyrics || null,
      syncedLyrics: data.syncedLyrics || null,
    });
  } catch (error: any) {
    console.error("Lyrics API error:", error);
    return NextResponse.json({ found: false, error: error.message });
  }
}
