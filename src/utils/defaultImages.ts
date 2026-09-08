import type { SyntheticEvent } from "react";

/**
 * defaultImages.ts — placeholder automotive photos shown until a shop
 * uploads their own (Service.images / ShopStorefront.coverImageUrl / etc).
 *
 * These are temporary stock placeholders, not RedPiston's real photography —
 * swap DEFAULT_CAR_PHOTOS for licensed shop/service photography before
 * relying on this for production marketing pages.
 *
 * Deterministic per-id (same service always shows the same default, instead
 * of jumping around on every re-render) via a simple hash into the pool.
 */

export const DEFAULT_CAR_PHOTOS: string[] = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=450&fit=crop&q=80", // detailing close-up
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=450&fit=crop&q=80", // car wash suds
  "https://images.unsplash.com/photo-1605164599901-db3722c62402?w=800&h=450&fit=crop&q=80", // interior detailing
  "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&h=450&fit=crop&q=80", // workshop bay
];

function hashToIndex(seed: number | string, len: number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
}

/** A stable default photo for a given entity id — same id always gets the same photo. */
export function defaultCarPhoto(seed: number | string): string {
  return DEFAULT_CAR_PHOTOS[hashToIndex(seed, DEFAULT_CAR_PHOTOS.length)];
}

/**
 * Attach to an <img>'s onError so a broken/blocked external URL degrades to
 * the element being hidden (caller's gradient/placeholder shows through)
 * instead of the browser's broken-image icon.
 */
export function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}
