import { Innertube, UniversalCache } from "youtubei.js";

let innertubeInstance: Innertube | null = null;
let initPromise: Promise<Innertube> | null = null;

export async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) {
    return innertubeInstance;
  }

  if (!initPromise) {
    initPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    }).then((yt) => {
      innertubeInstance = yt;
      return yt;
    });
  }

  return initPromise;
}
