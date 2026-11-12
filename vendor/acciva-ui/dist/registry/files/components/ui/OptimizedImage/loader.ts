import type { OptimizedImageLoader } from "@/components/ui/OptimizedImage/types";

export const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920] as const;

/** Default loader appends a `w` query param, which every mainstream CDN honours. */
export function defaultLoader(src: string, width: number): string {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}w=${width}`;
}

export function buildSrcSet(src: string, widths: readonly number[], loader: OptimizedImageLoader): string {
  return widths.map((width) => `${loader(src, width)} ${width}w`).join(", ");
}
