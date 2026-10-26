/**
 * Utility functions for transforming and handling high-fidelity artwork images
 * across client components and server route handlers.
 */

/**
 * Transforms low-resolution YouTube Music / Google CDN / YouTube video thumbnails
 * into ultra-crisp, high-definition (800x800 or HD 720p/1080p) artwork URLs.
 */
export function getHighResThumbnail(url?: string | null, fallbackVideoId?: string): string {
  if (!url || typeof url !== "string") {
    if (fallbackVideoId) {
      return `https://i.ytimg.com/vi/${fallbackVideoId}/hq720.jpg`;
    }
    return "/branding/aether-logo.jpg";
  }

  // 1. Google UserContent / YouTube Music CDN (e.g. =w60-h60-l90-rj, =w120-h120, =s120, etc.)
  if (url.includes("googleusercontent.com") || url.includes("ggpht.com")) {
    let upgraded = url;
    if (/=w\d+-h\d+[^?&]*/.test(upgraded)) {
      upgraded = upgraded.replace(/=w\d+-h\d+[^?&]*/, "=w800-h800-l90-rj");
    } else if (/=s\d+[^?&]*/.test(upgraded)) {
      upgraded = upgraded.replace(/=s\d+[^?&]*/, "=s800");
    } else if (!upgraded.includes("=")) {
      upgraded = `${upgraded}=w800-h800-l90-rj`;
    }
    return upgraded;
  }

  // 2. YouTube static video thumbnails (i.ytimg.com / img.youtube.com)
  if (url.includes("i.ytimg.com") || url.includes("img.youtube.com")) {
    return url.replace(/\/(?:default|mqdefault|hqdefault)\.jpg(\?.*)?$/i, "/hq720.jpg$1");
  }

  return url;
}

/**
 * Image error handler fallback: If a high-res image (e.g. hq720.jpg or maxresdefault.jpg) fails to load,
 * gracefully falls back to standard hqdefault.jpg or the brand placeholder without showing a broken image icon.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackVideoId?: string
) {
  const target = e.currentTarget;
  if (target.src.includes("hq720.jpg") || target.src.includes("maxresdefault.jpg")) {
    target.src = fallbackVideoId
      ? `https://i.ytimg.com/vi/${fallbackVideoId}/hqdefault.jpg`
      : target.src.replace(/\/(?:hq720|maxresdefault)\.jpg/, "/hqdefault.jpg");
  } else if (!target.src.includes("/branding/aether-logo.jpg")) {
    target.src = "/branding/aether-logo.jpg";
  }
}
