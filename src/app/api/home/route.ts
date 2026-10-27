import { NextRequest, NextResponse } from "next/server";
import { getInnertube, getHighResThumbnail } from "@/lib/youtube";
import { Track } from "@/types/music";

export const dynamic = "force-dynamic";

// In-memory server cache to ensure lightning fast, instantaneous responses
interface CacheEntry {
  tracks: Track[];
  timestamp: number;
}
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
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
      id: "DlFXDl_ROAM",
      title: "Die With A Smile",
      artist: "Lady Gaga & Bruno Mars",
      album: "Die With A Smile",
      duration: 251,
      durationFormatted: "4:11",
      thumbnail: "https://i.ytimg.com/vi/DlFXDl_ROAM/maxresdefault.jpg",
    },
    {
      id: "kIft-LUHHVA",
      title: "Espresso",
      artist: "Sabrina Carpenter",
      album: "Short n' Sweet",
      duration: 175,
      durationFormatted: "2:55",
      thumbnail: "https://i.ytimg.com/vi/kIft-LUHHVA/maxresdefault.jpg",
    },
    {
      id: "WKZO-CWeOVA",
      title: "BIRDS OF A FEATHER",
      artist: "Billie Eilish",
      album: "HIT ME HARD AND SOFT",
      duration: 194,
      durationFormatted: "3:14",
      thumbnail: "https://i.ytimg.com/vi/WKZO-CWeOVA/maxresdefault.jpg",
    },
    {
      id: "phLb_SoPBlA",
      title: "Not Like Us",
      artist: "Kendrick Lamar",
      album: "Not Like Us",
      duration: 274,
      durationFormatted: "4:34",
      thumbnail: "https://i.ytimg.com/vi/phLb_SoPBlA/maxresdefault.jpg",
    },
    {
      id: "DPaqlPFznBI",
      title: "A Bar Song (Tipsy)",
      artist: "Shaboozey",
      album: "Where I've Been, Isn't Where I'm Going",
      duration: 171,
      durationFormatted: "2:51",
      thumbnail: "https://i.ytimg.com/vi/DPaqlPFznBI/maxresdefault.jpg",
    },
    {
      id: "VZ-oGLluGAc",
      title: "Good Luck, Babe!",
      artist: "Chappell Roan",
      album: "Good Luck, Babe!",
      duration: 218,
      durationFormatted: "3:38",
      thumbnail: "https://i.ytimg.com/vi/VZ-oGLluGAc/maxresdefault.jpg",
    },
    {
      id: "a4O-abCXsfA",
      title: "Timeless",
      artist: "The Weeknd & Playboi Carti",
      album: "Hurry Up Tomorrow",
      duration: 256,
      durationFormatted: "4:16",
      thumbnail: "https://i.ytimg.com/vi/a4O-abCXsfA/maxresdefault.jpg",
    },
    {
      id: "-5GI38vWew8",
      title: "Taste",
      artist: "Sabrina Carpenter",
      album: "Short n' Sweet",
      duration: 157,
      durationFormatted: "2:37",
      thumbnail: "https://i.ytimg.com/vi/-5GI38vWew8/maxresdefault.jpg",
    },
    {
      id: "AeedWEyMYYo",
      title: "Lose Control",
      artist: "Teddy Swims",
      album: "I've Tried Everything But Therapy",
      duration: 210,
      durationFormatted: "3:30",
      thumbnail: "https://i.ytimg.com/vi/AeedWEyMYYo/maxresdefault.jpg",
    },
    {
      id: "eLhSxOAaWmg",
      title: "Beautiful Things",
      artist: "Benson Boone",
      album: "Fireworks & Rollerblades",
      duration: 180,
      durationFormatted: "3:00",
      thumbnail: "https://i.ytimg.com/vi/eLhSxOAaWmg/maxresdefault.jpg",
    },
    {
      id: "B8VEqSBTjZQ",
      title: "I Had Some Help",
      artist: "Post Malone ft. Morgan Wallen",
      album: "F-1 Trillion",
      duration: 178,
      durationFormatted: "2:58",
      thumbnail: "https://i.ytimg.com/vi/B8VEqSBTjZQ/maxresdefault.jpg",
    },
    {
      id: "fJ9rUzIMcZQ",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: 200,
      durationFormatted: "3:20",
      thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg",
    },
  ],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = (searchParams.get("category") || "all").toLowerCase();

  // 1. Check in-memory cache
  const cached = memoryCache.get(category);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.tracks.length > 0) {
    return NextResponse.json({ tracks: cached.tracks, source: "cache" });
  }

  const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.all;

  try {
    const yt = await getInnertube();
    const tracks: Track[] = [];
    const seenIds = new Set<string>();
    const seenThumbnails = new Set<string>();

    // Query genuine chart toppers in parallel
    const searchPromises = queries.map(async (query) => {
      try {
        const res = await yt.music.search(query, { type: "song" });
        const items = (res.songs?.contents || res.contents || []) as any[];

        // Find the first non-spam item
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

      // Extract base thumbnail key to guarantee unique artwork across all cards
      const thumbKey = track.thumbnail.split("?")[0].split("=")[0];
      if (seenThumbnails.has(thumbKey)) continue;

      seenIds.add(track.id);
      seenThumbnails.add(thumbKey);
      tracks.push(track);
    }

    // If fetched results are solid, store in memory cache
    if (tracks.length >= 8) {
      memoryCache.set(category, { tracks, timestamp: Date.now() });
      return NextResponse.json({ tracks, source: "innertube" });
    }

    // Fallback if network was throttled
    const fallback = FALLBACK_TRACKS[category] || FALLBACK_TRACKS.all;
    memoryCache.set(category, { tracks: fallback, timestamp: Date.now() });
    return NextResponse.json({ tracks: fallback, source: "fallback" });
  } catch (error: any) {
    console.error("Home feed error, serving fallback:", error);
    const fallback = FALLBACK_TRACKS[category] || FALLBACK_TRACKS.all;
    return NextResponse.json({ tracks: fallback, source: "fallback" });
  }
}
