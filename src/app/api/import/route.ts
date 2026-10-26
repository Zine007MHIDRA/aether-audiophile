import { NextRequest, NextResponse } from "next/server";
import { getInnertube, getHighResThumbnail } from "@/lib/youtube";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url?.trim();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' in request body" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Case A: YouTube / YouTube Music URL (with full continuation pagination)
    // -------------------------------------------------------------------------
    let ytListId: string | null = null;
    try {
      const parsedUrl = new URL(url);
      ytListId = parsedUrl.searchParams.get("list");
    } catch {
      const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (m) ytListId = m[1];
    }

    if (
      ytListId ||
      url.includes("youtube.com/playlist") ||
      url.includes("music.youtube.com/playlist")
    ) {
      if (!ytListId) {
        const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        if (m) ytListId = m[1];
      }

      if (!ytListId) {
        return NextResponse.json(
          { error: "Could not find a valid YouTube playlist ID ('list=...')" },
          { status: 400 }
        );
      }

      try {
        const yt = await getInnertube();
        let pl: any = null;

        try {
          pl = await yt.getPlaylist(ytListId);
        } catch {
          pl = await yt.music.getPlaylist(ytListId);
        }

        if (!pl) {
          return NextResponse.json(
            { error: "YouTube playlist not found or is private" },
            { status: 404 }
          );
        }

        const name =
          pl.info?.title?.text ||
          pl.info?.title ||
          pl.header?.title?.text ||
          pl.title ||
          "Imported YouTube Playlist";

        const coverUrl =
          pl.info?.thumbnails?.[0]?.url ||
          pl.header?.thumbnails?.[0]?.url ||
          undefined;

        // Paginate across all continuation pages up to 2,000 tracks
        let rawVideos = [...(pl.videos || [])] as any[];
        let currentContinuation = pl;
        const maxLimit = 2000;

        while (
          currentContinuation?.has_continuation &&
          rawVideos.length < maxLimit
        ) {
          try {
            currentContinuation = await currentContinuation.getContinuation();
            if (
              currentContinuation?.videos &&
              currentContinuation.videos.length > 0
            ) {
              rawVideos = rawVideos.concat(currentContinuation.videos);
            } else {
              break;
            }
          } catch (contErr) {
            console.warn("YouTube continuation pagination warning:", contErr);
            break;
          }
        }

        const tracks: Track[] = [];

        for (const v of rawVideos) {
          const id = v.id || v.content_id || v.video_id;
          if (!id) continue;

          const title =
            (typeof v.title === "string" ? v.title : v.title?.text) ||
            v.metadata?.title?.text ||
            "Unknown Track";

          const artist =
            (typeof v.author === "string" ? v.author : v.author?.name) ||
            v.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text ||
            v.short_byline?.text ||
            "Unknown Artist";

          let duration = v.duration?.seconds || 0;
          let durationFormatted = v.duration?.text || "3:30";

          if (!duration && typeof durationFormatted === "string") {
            const parts = durationFormatted.split(":").map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              duration = parts[0] * 60 + parts[1];
            } else if (
              parts.length === 3 &&
              !isNaN(parts[0]) &&
              !isNaN(parts[1]) &&
              !isNaN(parts[2])
            ) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }

          const rawThumbnail =
            v.thumbnails?.[0]?.url ||
            v.content_image?.image?.[0]?.url ||
            v.thumbnails?.[v.thumbnails.length - 1]?.url;
          const thumbnail = getHighResThumbnail(rawThumbnail, id);

          tracks.push({
            id,
            title,
            artist,
            duration,
            durationFormatted,
            thumbnail,
          });
        }

        if (tracks.length === 0) {
          return NextResponse.json(
            { error: "No tracks could be found in this YouTube playlist" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          name,
          coverUrl,
          tracks,
          needsMatching: false,
        });
      } catch (err: any) {
        console.error("YouTube playlist import error:", err);
        return NextResponse.json(
          { error: `Failed to fetch YouTube playlist: ${err?.message || "Unknown error"}` },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Case B: Spotify Playlist URL
    // -------------------------------------------------------------------------
    const spotifyMatch = url.match(
      /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/|spotify:playlist:)([a-zA-Z0-9]+)/i
    );

    if (spotifyMatch) {
      const spotifyId = spotifyMatch[1];
      const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
      const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      // 1. If Spotify API credentials are configured, use Spotify Web API for full 2,000+ pagination
      if (spotifyClientId && spotifyClientSecret) {
        try {
          const authHeader = Buffer.from(
            `${spotifyClientId}:${spotifyClientSecret}`
          ).toString("base64");

          const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // Fetch playlist details
            const plRes = await fetch(
              `https://api.spotify.com/v1/playlists/${spotifyId}?fields=name,images,tracks.total`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );

            if (plRes.ok) {
              const plData = await plRes.json();
              const name = plData.name || "Imported Spotify Playlist";
              const coverUrl = plData.images?.[0]?.url;
              const totalTracks = plData.tracks?.total || 0;

              // Loop through track pages up to 2,000 tracks
              const allItems: any[] = [];
              let offset = 0;
              const pageLimit = 100;
              const maxLimit = 2000;

              while (offset < totalTracks && offset < maxLimit) {
                const pageRes = await fetch(
                  `https://api.spotify.com/v1/playlists/${spotifyId}/tracks?limit=${pageLimit}&offset=${offset}&fields=items(track(name,artists(name),album(name,images),duration_ms))`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }
                );
                if (!pageRes.ok) break;
                const pageData = await pageRes.json();
                const pageItems = pageData.items || [];
                if (pageItems.length === 0) break;

                for (const entry of pageItems) {
                  const t = entry.track;
                  if (!t || !t.name) continue;
                  const title = t.name;
                  const artist =
                    (t.artists || []).map((a: any) => a.name).join(", ") ||
                    "Unknown Artist";
                  const durationMs = t.duration_ms || 0;
                  const duration = Math.round(durationMs / 1000);
                  const mins = Math.floor(duration / 60);
                  const secs = duration % 60;
                  const durationFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
                  const thumbnail =
                    t.album?.images?.[0]?.url ||
                    coverUrl ||
                    "/branding/aether-logo.jpg";

                  allItems.push({
                    title,
                    artist,
                    album: t.album?.name,
                    duration,
                    durationFormatted,
                    thumbnail,
                  });
                }

                offset += pageItems.length;
              }

              if (allItems.length > 0) {
                const queries = allItems
                  .map((t) => `${t.title} ${t.artist}`.trim())
                  .filter(Boolean);

                return NextResponse.json({
                  name,
                  coverUrl,
                  items: allItems,
                  queries,
                  needsMatching: true,
                });
              }
            }
          }
        } catch (apiErr) {
          console.warn("Spotify Web API error, falling back to embed:", apiErr);
        }
      }

      // 2. Fallback to public embed endpoint
      try {
        const embedRes = await fetch(
          `https://open.spotify.com/embed/playlist/${spotifyId}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "text/html",
            },
          }
        );

        if (!embedRes.ok) {
          return NextResponse.json(
            { error: `Spotify embed returned status ${embedRes.status}` },
            { status: 502 }
          );
        }

        const html = await embedRes.text();
        const startIdx = html.indexOf('id="__NEXT_DATA__"');
        if (startIdx === -1) {
          return NextResponse.json(
            { error: "Could not locate metadata script in Spotify embed" },
            { status: 502 }
          );
        }

        const contentStart = html.indexOf(">", startIdx) + 1;
        const contentEnd = html.indexOf("</script>", contentStart);
        const data = JSON.parse(html.slice(contentStart, contentEnd));
        const entity = data.props?.pageProps?.state?.data?.entity;

        if (!entity) {
          return NextResponse.json(
            { error: "Spotify playlist data entity not found" },
            { status: 404 }
          );
        }

        const name = entity.name || entity.title || "Imported Spotify Playlist";
        const coverUrl =
          entity.coverArt?.sources?.[0]?.url || entity.images?.[0]?.url;
        const trackList = entity.trackList || [];

        const items = trackList.map((t: any) => {
          const title = t.title || "Unknown Track";
          const artist = t.subtitle || "Unknown Artist";
          const durationMs = t.duration || 0;
          const duration = Math.round(durationMs / 1000);
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          const durationFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
          return {
            title,
            artist,
            duration,
            durationFormatted,
            thumbnail: coverUrl || "/branding/aether-logo.jpg",
          };
        });

        const queries = items
          .map((t: any) => `${t.title} ${t.artist}`.trim())
          .filter(Boolean);

        if (queries.length === 0) {
          return NextResponse.json(
            { error: "No tracks found in Spotify playlist" },
            { status: 404 }
          );
        }

        const truncatedWarning =
          items.length >= 100
            ? "Spotify public embed limit reached (100 tracks). To import 100+ to 2,000+ tracks without limits, drop an Exportify CSV or add SPOTIFY_CLIENT_ID to your environment."
            : undefined;

        return NextResponse.json({
          name,
          coverUrl,
          items,
          queries,
          needsMatching: true,
          truncatedWarning,
        });
      } catch (err: any) {
        console.error("Spotify import error:", err);
        return NextResponse.json(
          { error: `Failed to fetch Spotify playlist: ${err?.message || "Unknown error"}` },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Case C: Deezer Playlist URL (with pagination up to 2,000 tracks)
    // -------------------------------------------------------------------------
    const deezerMatch = url.match(
      /(?:deezer\.com\/(?:[a-z]{2}\/)?playlist\/)(\d+)/i
    );

    if (deezerMatch) {
      const deezerId = deezerMatch[1];
      try {
        const deezerRes = await fetch(
          `https://api.deezer.com/playlist/${deezerId}`
        );

        if (!deezerRes.ok) {
          return NextResponse.json(
            { error: `Deezer API returned status ${deezerRes.status}` },
            { status: 502 }
          );
        }

        const json = await deezerRes.json();
        if (json.error) {
          return NextResponse.json(
            { error: json.error.message || "Deezer playlist not found" },
            { status: 404 }
          );
        }

        const name = json.title || "Imported Deezer Playlist";
        const coverUrl =
          json.picture_medium || json.picture_xl || json.picture;

        let tracksData = [...(json.tracks?.data || [])];
        let nextUrl = json.tracks?.next;
        const maxLimit = 2000;

        while (nextUrl && tracksData.length < maxLimit) {
          try {
            const nextRes = await fetch(nextUrl);
            if (!nextRes.ok) break;
            const nextJson = await nextRes.json();
            if (nextJson.data && nextJson.data.length > 0) {
              tracksData = tracksData.concat(nextJson.data);
              nextUrl = nextJson.next;
            } else {
              break;
            }
          } catch {
            break;
          }
        }

        const items = tracksData.map((t: any) => {
          const title = t.title || "Unknown Track";
          const artist = t.artist?.name || "Unknown Artist";
          const duration = t.duration || 0;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          const durationFormatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
          return {
            title,
            artist,
            album: t.album?.title,
            duration,
            durationFormatted,
            thumbnail:
              t.album?.cover_xl ||
              t.album?.cover_big ||
              t.album?.cover_medium ||
              coverUrl ||
              "/branding/aether-logo.jpg",
          };
        });

        const queries = items
          .map((t: any) => `${t.title} ${t.artist}`.trim())
          .filter(Boolean);

        if (queries.length === 0) {
          return NextResponse.json(
            { error: "No tracks found in Deezer playlist" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          name,
          coverUrl,
          items,
          queries,
          needsMatching: true,
        });
      } catch (err: any) {
        console.error("Deezer import error:", err);
        return NextResponse.json(
          { error: `Failed to fetch Deezer playlist: ${err?.message || "Unknown error"}` },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Case D: Apple Music Playlist URL
    // -------------------------------------------------------------------------
    if (url.includes("music.apple.com") && url.includes("/playlist/")) {
      try {
        const appleRes = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html",
          },
        });

        if (!appleRes.ok) {
          return NextResponse.json(
            { error: `Apple Music returned status ${appleRes.status}` },
            { status: 502 }
          );
        }

        const html = await appleRes.text();

        // 1. Try serialized-server-data (best fidelity with artist names)
        const serverDataMatch = html.match(
          /id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/
        );

        if (serverDataMatch) {
          try {
            const parsed = JSON.parse(serverDataMatch[1]);
            const sections = parsed.data?.[0]?.data?.sections || [];
            const header = sections[0]?.items?.[0];
            const name = header?.title || "Imported Apple Music Playlist";
            const artworkUrl = header?.artwork?.dictionary?.url;
            const coverUrl = artworkUrl
              ? artworkUrl.replace("{w}x{h}bb.{f}", "600x600bb.jpg")
              : undefined;

            const items: any[] = [];
            for (const section of sections) {
              if (
                section.itemKind === "trackLockup" &&
                Array.isArray(section.items)
              ) {
                for (const item of section.items) {
                  const title = item.title;
                  const artist = item.artistName || "Unknown Artist";
                  if (title) {
                    items.push({
                      title,
                      artist,
                      duration: 0,
                      durationFormatted: "3:30",
                      thumbnail: coverUrl || "/branding/aether-logo.jpg",
                    });
                  }
                }
              }
            }

            if (items.length > 0) {
              const queries = items.map((t) => `${t.title} ${t.artist}`.trim());
              return NextResponse.json({
                name,
                coverUrl,
                items,
                queries,
                needsMatching: true,
              });
            }
          } catch (e) {
            console.warn("Failed parsing serialized-server-data from Apple Music:", e);
          }
        }

        // 2. Fallback to application/ld+json
        const ldIdx = html.indexOf("application/ld+json");
        if (ldIdx !== -1) {
          const start = html.indexOf(">", ldIdx) + 1;
          const end = html.indexOf("</script>", start);
          const json = JSON.parse(html.slice(start, end));
          const name = json.name || "Imported Apple Music Playlist";
          const queries = (json.track || [])
            .map((t: any) => t.name)
            .filter(Boolean);

          if (queries.length > 0) {
            const items = queries.map((q: string) => ({
              title: q,
              artist: "",
              duration: 0,
              durationFormatted: "3:30",
              thumbnail: "/branding/aether-logo.jpg",
            }));
            return NextResponse.json({
              name,
              items,
              queries,
              needsMatching: true,
            });
          }
        }

        return NextResponse.json(
          { error: "Could not extract tracks from Apple Music playlist" },
          { status: 404 }
        );
      } catch (err: any) {
        console.error("Apple Music import error:", err);
        return NextResponse.json(
          { error: `Failed to fetch Apple Music playlist: ${err?.message || "Unknown error"}` },
          { status: 502 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Unsupported platform
    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        error:
          "Unsupported playlist URL. Please provide a valid YouTube, YouTube Music, Spotify, Deezer, or Apple Music playlist link.",
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Import API fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
