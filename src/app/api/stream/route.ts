import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

// In-memory cache for resolved stream URLs (valid for 3 hours)
const urlCache = new Map<string, { url: string; expires: number }>();

async function resolveAudioUrl(id: string): Promise<string> {
  const cached = urlCache.get(id);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }

  // 1. Primary: yt-dlp (fast, reliable, extracts direct Opus/WebM audio stream)
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "-g",
      "-f",
      "bestaudio",
      `https://www.youtube.com/watch?v=${id}`,
    ]);

    // Safely extract the line starting with http (ignoring warning outputs)
    const directUrl = stdout
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("http"));

    if (directUrl) {
      urlCache.set(id, { url: directUrl, expires: Date.now() + 3 * 3600 * 1000 });
      return directUrl;
    }
  } catch (err) {
    console.warn("yt-dlp resolution failed, attempting fallback:", err);
  }

  // 2. Fallback: Public Invidious API
  const invidiousInstances = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://invidious.jing.rocks",
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${id}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const formats = data.adaptiveFormats || data.formatStreams || [];
        const audio = formats.find(
          (f: any) => f.type?.includes("audio") || f.itag === "251" || f.itag === "140"
        );
        if (audio?.url) {
          urlCache.set(id, { url: audio.url, expires: Date.now() + 2 * 3600 * 1000 });
          return audio.url;
        }
      }
    } catch {}
  }

  throw new Error("Unable to resolve audio stream for track: " + id);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing track id" }, { status: 400 });
  }

  try {
    const directUrl = await resolveAudioUrl(id);
    const rangeHeader = req.headers.get("range");

    // Forward range request to Google CDN
    const upstreamRes = await fetch(directUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });

    const headers = new Headers();
    const contentType = upstreamRes.headers.get("content-type") || "audio/webm";
    const contentLength = upstreamRes.headers.get("content-length");
    const contentRange = upstreamRes.headers.get("content-range");

    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=14400");

    if (contentLength) headers.set("Content-Length", contentLength);
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error: any) {
    console.error("Stream route error:", error);
    return NextResponse.json(
      { error: error?.message || "Streaming failed" },
      { status: 500 }
    );
  }
}
