import type { RGBA } from "./types.js";
/** Strict CSS colour parser: `#hex` (3/4/6/8), `rgb[a]()`, `hsl[a]()`, `oklch()`. Returns `null` on anything else and never throws. */
export declare function parseColor(input: unknown): RGBA | null;
