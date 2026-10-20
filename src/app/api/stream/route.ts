import { NextRequest, NextResponse } from "next/server";
import { getInnertube } from "@/lib/youtube";

export const dynamic = "force-dynamic";

// In-memory cache for resolved stream URLs (valid for 2 hours)
const urlCache = new Map<string, { url: string; expires: number }>();

async function resolveAudioUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached && Date.now() < cached.expires) {
    return cached.url;
  }

  const yt = await getInnertube();

  // Try VISIONOS client first (reliable direct audio, no botguard block, full range seeking)
  let info = await yt.getBasicInfo(id, { client: "VISIONOS" }).catch(() => null);
  if (!info || !info.streaming_data) {
    info = await yt.getBasicInfo(id, { client: "IOS" }).catch(() => null);
  }
  if (!info || !info.streaming_data) {
    info = await yt.getBasicInfo(id).catch(() => null);
  }
  if (!info || !info.streaming_data) return null;

  let format: any = null;
  try {
    format = info.chooseFormat({ type: "audio", quality: "best" });
  } catch {
    return null;
  }
  if (!format) return null;

  let directUrl: string | null = null;
  if (format.url) {
    directUrl = format.url;
  } else if (typeof format.decipher === "function") {
    directUrl = await format.decipher(yt.session.player).catch(() => null);
  }

  if (directUrl && directUrl.startsWith("http")) {
    urlCache.set(id, { url: directUrl, expires: Date.now() + 2 * 3600 * 1000 });
    return directUrl;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing video ID" }, { status: 400 });
  }

  let directUrl: string | null = null;
  try {
    directUrl = await resolveAudioUrl(id);
  } catch (err) {
    console.error("Audio format resolution error:", err);
  }

  if (!directUrl) {
    return NextResponse.json({ error: "No audio format found" }, { status: 404 });
  }

  const rangeHeader = req.headers.get("range");

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(directUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });
  } catch (err) {
    console.error("Upstream audio fetch failed:", err);
    return NextResponse.json(
      { error: "Upstream audio fetch failed" },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    urlCache.delete(id);
    return NextResponse.json(
      { error: "Upstream audio fetch failed" },
      { status: 502 }
    );
  }

  const headers = new Headers();
  const contentType = upstreamRes.headers.get("content-type") || "audio/mp4";
  const contentLength = upstreamRes.headers.get("content-length");
  const contentRange = upstreamRes.headers.get("content-range");
  const cacheControl = upstreamRes.headers.get("cache-control") || "public, max-age=14400";

  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", cacheControl);

  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}
