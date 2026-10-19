export interface Track {
  id: string; // YouTube videoId
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  durationFormatted: string; // e.g. "3:45"
  thumbnail: string;
}

export interface SearchResults {
  tracks: Track[];
  artists?: {
    id: string;
    name: string;
    thumbnail?: string;
  }[];
  albums?: {
    id: string;
    title: string;
    artist: string;
    thumbnail?: string;
    year?: string;
  }[];
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}
