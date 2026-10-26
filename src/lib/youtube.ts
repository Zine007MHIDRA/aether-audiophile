import { Innertube, Platform } from "youtubei.js";

// Provide JavaScript interpreter shim for deciphering streaming URLs in Node.js / Vercel
if (Platform?.shim) {
  Platform.shim.eval = async (data: any) => {
    return new Function(data.output)();
  };
}

let innertubeInstance: Innertube | null = null;
let initPromise: Promise<Innertube> | null = null;

export async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) {
    return innertubeInstance;
  }

  if (!initPromise) {
    initPromise = Innertube.create().then((yt) => {
      innertubeInstance = yt;
      return yt;
    });
  }

  return initPromise;
}

export { getHighResThumbnail } from "./image";
