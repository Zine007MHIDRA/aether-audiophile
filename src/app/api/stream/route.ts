import { NextRequest, NextResponse } from "next/server";
import { getInnertube } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing track id" }, { status: 400 });
  }

  try {
    const yt = await getInnertube();

    // Check if client requested a byte range
    const rangeHeader = req.headers.get("range");
    let range: { start: number; end: number } | undefined;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parts[0] ? parseInt(parts[0], 10) : 0;
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;
      if (typeof start === "number" && typeof end === "number") {
        range = { start, end };
      }
    }

    // Download audio stream using Innertube
    const stream = await yt.download(id, {
      type: "audio",
      quality: "best",
      ...(range ? { range } : {}),
    });

    const headers = new Headers();
    headers.set("Content-Type", "audio/webm; codecs=opus");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    // If a range was requested, reply with 206 Partial Content
    const status = rangeHeader ? 206 : 200;

    return new Response(stream as any, {
      status,
      headers,
    });
  } catch (error: any) {
    console.error("Stream API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve stream" },
      { status: 500 }
    );
  }
}
