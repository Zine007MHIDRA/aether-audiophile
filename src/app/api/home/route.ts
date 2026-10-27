import { NextRequest, NextResponse } from "next/server";
import { getInnertube, getHighResThumbnail } from "@/lib/youtube";
import { getLiveBillboardHot100, BillboardSong } from "@/lib/billboard";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

// In-memory server cache to ensure lightning fast, instantaneous responses
interface CacheEntry {
  tracks: Track[];
  timestamp: number;
  chartDate?: string;
}
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache matching Billboard weekly refresh
const memoryCache = new Map<string, CacheEntry>();

// Anti-spam & bootleg compilation blocker
function isSpamTrack(title: string, artist: string): boolean {
  const t = (title || "").toLowerCase();
  const a = (artist || "").toLowerCase();

  const spamArtists = [
    "popular artist",
    "various artists",
    "undefined",
    "unknown",
    "dance rocker",
    "hits playlist",
    "top hits",
    "karaoke",
    "tribute band",
    "adamxyz",
    "cover band",
    "singing monsters",
  ];
  if (spamArtists.some((sa) => a.includes(sa))) return true;

  const spamTerms = [
    "remix compilation",
    "dance rocker",
    "clubmix",
    "club mix",
    "galactic mix",
    "a-list pop",
    "today's 50",
    "global top hits",
    "speed up",
    "slowed + reverb",
    "8d audio",
    "ringtone",
    "instrumental version",
    "karaoke",
    "made famous by",
    "originally performed by",
    "tribute to",
    "workout mix",
    "cover version",
  ];
  if (spamTerms.some((term) => t.includes(term))) return true;

  return false;
}

// Curated pool of genuine world-class chart-toppers & flagship artist queries
const CATEGORY_QUERIES: Record<string, string[]> = {
  all: [
    "Die With A Smile Lady Gaga Bruno Mars",
    "Espresso Sabrina Carpenter",
    "BIRDS OF A FEATHER Billie Eilish",
    "Not Like Us Kendrick Lamar",
    "A Bar Song Shaboozey",
    "Good Luck Babe Chappell Roan",
    "Timeless The Weeknd Playboi Carti",
    "Taste Sabrina Carpenter",
    "Lose Control Teddy Swims",
    "Beautiful Things Benson Boone",
    "I Had Some Help Post Malone Morgan Wallen",
    "Too Sweet Hozier",
    "Cruel Summer Taylor Swift",
    "Blinding Lights The Weeknd",
    "Paint The Town Red Doja Cat",
    "Houdini Dua Lipa",
    "Snooze SZA",
    "FE!N Travis Scott",
    "Greedy Tate McRae",
    "Water Tyla",
    "As It Was Harry Styles",
    "Flowers Miley Cyrus",
    "One Dance Drake",
    "golden hour JVKE",
  ],
  pop: [
    "Espresso Sabrina Carpenter",
    "Die With A Smile Lady Gaga Bruno Mars",
    "BIRDS OF A FEATHER Billie Eilish",
    "Good Luck Babe Chappell Roan",
    "Taste Sabrina Carpenter",
    "Cruel Summer Taylor Swift",
    "Levitating Dua Lipa",
    "vampire Olivia Rodrigo",
    "Greedy Tate McRae",
    "we can't be friends Ariana Grande",
    "Please Please Please Sabrina Carpenter",
    "360 Charli xcx",
    "Houdini Dua Lipa",
    "As It Was Harry Styles",
    "Save Your Tears The Weeknd",
    "Flowers Miley Cyrus",
  ],
  hiphop: [
    "Not Like Us Kendrick Lamar",
    "FE!N Travis Scott",
    "Timeless The Weeknd Playboi Carti",
    "Snooze SZA",
    "Rich Baby Daddy Drake",
    "Like That Future Metro Boomin Kendrick Lamar",
    "fukumean Gunna",
    "redrum 21 Savage",
    "Agora Hills Doja Cat",
    "Lovin On Me Jack Harlow",
    "Kill Bill SZA",
    "Goosebumps Travis Scott",
    "HUMBLE Kendrick Lamar",
    "White Iverson Post Malone",
  ],
  electronic: [
    "It Goes Like Nanana Peggy Gou",
    "Turn On The Lights again Fred again Swedish House Mafia",
    "Miracle Calvin Harris Ellie Goulding",
    "Take It Off Fisher Aatig",
    "Higher Than Ever Before Disclosure",
    "Innerbloom Rufus Du Sol",
    "I'm Good Blue David Guetta Bebe Rexha",
    "adore u Fred again",
    "Glue Bicep",
    "One More Time Daft Punk",
    "Don't You Worry Child Swedish House Mafia",
    "The Nights Avicii",
  ],
  rock: [
    "The Emptiness Machine Linkin Park",
    "Do I Wanna Know Arctic Monkeys",
    "Too Sweet Hozier",
    "Viva La Vida Coldplay",
    "Mr Brightside The Killers",
    "Believer Imagine Dragons",
    "Californication Red Hot Chili Peppers",
    "Smells Like Teen Spirit Nirvana",
    "Bohemian Rhapsody Queen",
    "Creep Radiohead",
    "Feel Good Inc Gorillaz",
    "Cigarette Daydreams Cage The Elephant",
  ],
  chill: [
    "WILDFLOWER Billie Eilish",
    "I Remember Everything Zach Bryan Kacey Musgraves",
    "Stick Season Noah Kahan",
    "golden hour JVKE",
    "Apocalypse Cigarettes After Sex",
    "Glimpse of Us Joji",
    "Pink + White Frank Ocean",
    "Best Part Daniel Caesar H.E.R.",
    "From The Start Laufey",
    "Until I Found You Stephen Sanchez",
    "Heather Conan Gray",
    "Chamber of Reflection Mac DeMarco",
  ],
};

// Verified fallback catalog ensuring the Sanctuary Discover page never fails or looks empty
const FALLBACK_TRACKS: Record<string, Track[]> = {
  all: [
    {
      id: "V-uIp-WuD60",
      title: "Patient Zero",
      artist: "Taylor Swift",
      album: "Patient Zero",
      duration: 218,
      durationFormatted: "3:38",
      thumbnail: "https://i.ytimg.com/vi/V-uIp-WuD60/maxresdefault.jpg",
      rank: 1,
      chartDate: "2026-10-24",
    },
    {
      id: "xukbqwRuN5w",
      title: "Choosin' Texas",
      artist: "Ella Langley",
      album: "hungover",
      duration: 194,
      durationFormatted: "3:14",
      thumbnail: "https://i.ytimg.com/vi/xukbqwRuN5w/maxresdefault.jpg",
      rank: 2,
      chartDate: "2026-10-24",
    },
    {
      id: "6KjVYeQ9SRw",
      title: "Boston",
      artist: "Stella Lefty",
      album: "Boston",
      duration: 182,
      durationFormatted: "3:02",
      thumbnail: "https://i.ytimg.com/vi/6KjVYeQ9SRw/maxresdefault.jpg",
      rank: 3,
      chartDate: "2026-10-24",
    },
    {
      id: "-YOpbOA8-5o",
      title: "Been By Now",
      artist: "Morgan Wallen",
      album: "One Thing At A Time",
      duration: 204,
      durationFormatted: "3:24",
      thumbnail: "https://i.ytimg.com/vi/-YOpbOA8-5o/maxresdefault.jpg",
      rank: 4,
      chartDate: "2026-10-24",
    },
    {
      id: "8_C6lXoGB5Y",
      title: "Dracula",
      artist: "Tame Impala & JENNIE",
      album: "Dracula",
      duration: 232,
      durationFormatted: "3:52",
      thumbnail: "https://i.ytimg.com/vi/8_C6lXoGB5Y/maxresdefault.jpg",
      rank: 5,
      chartDate: "2026-10-24",
    },
    {
      id: "_U9h14uW6g8",
      title: "Nicole Kidman",
      artist: "ADELA",
      album: "Nicole Kidman",
      duration: 176,
      durationFormatted: "2:56",
      thumbnail: "https://i.ytimg.com/vi/_U9h14uW6g8/maxresdefault.jpg",
      rank: 6,
      chartDate: "2026-10-24",
    },
    {
      id: "xXnJgX38N60",
      title: "Hate That I Made You Love Me",
      artist: "Ariana Grande",
      album: "eternal sunshine",
      duration: 215,
      durationFormatted: "3:35",
      thumbnail: "https://i.ytimg.com/vi/xXnJgX38N60/maxresdefault.jpg",
      rank: 7,
      chartDate: "2026-10-24",
    },
    {
      id: "170X1b9eQ08",
      title: "Stupid Song",
      artist: "Olivia Rodrigo",
      album: "GUTS",
      duration: 190,
      durationFormatted: "3:10",
      thumbnail: "https://i.ytimg.com/vi/170X1b9eQ08/maxresdefault.jpg",
      rank: 8,
      chartDate: "2026-10-24",
    },
    {
      id: "DlFXDl_ROAM",
      title: "Die With A Smile",
      artist: "Lady Gaga & Bruno Mars",
      album: "Die With A Smile",
      duration: 251,
      durationFormatted: "4:11",
      thumbnail: "https://i.ytimg.com/vi/DlFXDl_ROAM/maxresdefault.jpg",
      rank: 9,
      chartDate: "2026-10-24",
    },
    {
      id: "kIft-LUHHVA",
      title: "Espresso",
      artist: "Sabrina Carpenter",
      album: "Short n' Sweet",
      duration: 175,
      durationFormatted: "2:55",
      thumbnail: "https://i.ytimg.com/vi/kIft-LUHHVA/maxresdefault.jpg",
      rank: 10,
      chartDate: "2026-10-24",
    },
    {
      id: "WKZO-CWeOVA",
      title: "BIRDS OF A FEATHER",
      artist: "Billie Eilish",
      album: "HIT ME HARD AND SOFT",
      duration: 194,
      durationFormatted: "3:14",
      thumbnail: "https://i.ytimg.com/vi/WKZO-CWeOVA/maxresdefault.jpg",
      rank: 11,
      chartDate: "2026-10-24",
    },
    {
      id: "phLb_SoPBlA",
      title: "Not Like Us",
      artist: "Kendrick Lamar",
      album: "Not Like Us",
      duration: 274,
      durationFormatted: "4:34",
      thumbnail: "https://i.ytimg.com/vi/phLb_SoPBlA/maxresdefault.jpg",
      rank: 12,
      chartDate: "2026-10-24",
    },
  ],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = (searchParams.get("category") || "all").toLowerCase();

  // 1. Check in-memory cache
  const cached = memoryCache.get(category);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.tracks.length > 0) {
    return NextResponse.json({
      tracks: cached.tracks,
      chartDate: cached.chartDate,
      source: "cache",
    });
  }

  try {
    const yt = await getInnertube();
    const tracks: Track[] = [];
    const seenIds = new Set<string>();
    const seenThumbnails = new Set<string>();

    if (category === "all") {
      // DYNAMIC BILLBOARD HOT 100 INGESTION FOR CURRENT 2026 DATE
      const billboardData = await getLiveBillboardHot100();
      const billboardEntries = billboardData.songs.slice(0, 24);

      const billboardPromises = billboardEntries.map(async (entry) => {
        try {
          const res = await yt.music.search(`${entry.song} ${entry.artist}`, { type: "song" });
          const items = (res.songs?.contents || res.contents || []) as any[];

          for (const item of items.slice(0, 3)) {
            if (!item?.id) continue;
            const itemTitle =
              typeof item.title === "string"
                ? item.title
                : item.title?.text || item.name || entry.song;
            const itemArtist =
              item.artists?.[0]?.name || item.author?.name || entry.artist;

            if (isSpamTrack(itemTitle, itemArtist)) continue;

            const durationSec = item.duration?.seconds || 210;
            const durationFormatted = item.duration?.text || "3:30";
            const rawThumb =
              item.thumbnails?.[0]?.url ||
              item.thumbnails?.[item.thumbnails.length - 1]?.url;
            const thumbnail = getHighResThumbnail(rawThumb, item.id);

            return {
              id: item.id,
              title: entry.song,
              artist: entry.artist,
              album: item.album?.name || "Billboard Hot 100 Single",
              duration: durationSec,
              durationFormatted,
              thumbnail,
              rank: entry.this_week,
              chartDate: billboardData.date,
            };
          }
          return null;
        } catch {
          return null;
        }
      });

      const searchResults = await Promise.all(billboardPromises);

      for (const track of searchResults) {
        if (!track) continue;
        if (seenIds.has(track.id)) continue;

        const thumbKey = track.thumbnail.split("?")[0].split("=")[0];
        if (seenThumbnails.has(thumbKey)) continue;

        seenIds.add(track.id);
        seenThumbnails.add(thumbKey);
        tracks.push(track);
      }

      // Sort by Billboard rank to ensure clean 1, 2, 3... order
      tracks.sort((a, b) => (a.rank || 999) - (b.rank || 999));

      if (tracks.length >= 8) {
        memoryCache.set(category, {
          tracks,
          timestamp: Date.now(),
          chartDate: billboardData.date,
        });
        return NextResponse.json({
          tracks,
          chartDate: billboardData.date,
          source: "billboard-live",
        });
      }
    } else {
      // GENRE-SPECIFIC CURATION
      const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.all;
      const searchPromises = queries.map(async (query) => {
        try {
          const res = await yt.music.search(query, { type: "song" });
          const items = (res.songs?.contents || res.contents || []) as any[];

          for (const item of items.slice(0, 3)) {
            if (!item?.id) continue;
            const title =
              typeof item.title === "string"
                ? item.title
                : item.title?.text || item.name || "Track";
            const artist =
              item.artists?.[0]?.name || item.author?.name || "Featured Artist";

            if (isSpamTrack(title, artist)) continue;

            const durationSec = item.duration?.seconds || 210;
            const durationFormatted = item.duration?.text || "3:30";
            const rawThumb =
              item.thumbnails?.[0]?.url ||
              item.thumbnails?.[item.thumbnails.length - 1]?.url;
            const thumbnail = getHighResThumbnail(rawThumb, item.id);

            return {
              id: item.id,
              title,
              artist,
              album: item.album?.name || "Studio Master",
              duration: durationSec,
              durationFormatted,
              thumbnail,
            };
          }
          return null;
        } catch {
          return null;
        }
      });

      const searchResults = await Promise.all(searchPromises);

      for (const track of searchResults) {
        if (!track) continue;
        if (seenIds.has(track.id)) continue;

        const thumbKey = track.thumbnail.split("?")[0].split("=")[0];
        if (seenThumbnails.has(thumbKey)) continue;

        seenIds.add(track.id);
        seenThumbnails.add(thumbKey);
        tracks.push(track);
      }

      if (tracks.length >= 8) {
        memoryCache.set(category, { tracks, timestamp: Date.now() });
        return NextResponse.json({ tracks, source: "innertube" });
      }
    }

    // Fallback if needed
    const fallback = FALLBACK_TRACKS[category] || FALLBACK_TRACKS.all;
    memoryCache.set(category, {
      tracks: fallback,
      timestamp: Date.now(),
      chartDate: "2026-10-24",
    });
    return NextResponse.json({
      tracks: fallback,
      chartDate: "2026-10-24",
      source: "fallback",
    });
  } catch (error: any) {
    console.error("Home feed error, serving fallback:", error);
    const fallback = FALLBACK_TRACKS[category] || FALLBACK_TRACKS.all;
    return NextResponse.json({
      tracks: fallback,
      chartDate: "2026-10-24",
      source: "fallback",
    });
  }
}
