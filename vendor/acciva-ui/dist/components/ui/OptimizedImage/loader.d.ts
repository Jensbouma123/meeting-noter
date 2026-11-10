import type { OptimizedImageLoader } from "./types.js";
export declare const DEFAULT_WIDTHS: readonly [320, 480, 640, 768, 1024, 1280, 1536, 1920];
/** Default loader appends a `w` query param, which every mainstream CDN honours. */
export declare function defaultLoader(src: string, width: number): string;
export declare function buildSrcSet(src: string, widths: readonly number[], loader: OptimizedImageLoader): string;
