import type { HarmonyMode, OKLCH } from "./types.js";
/**
 * Hue offsets in degrees, applied to the seed. `monochromatic` holds the hue and
 * walks lightness instead, so it carries no offsets.
 */
export declare const HARMONY_OFFSETS: Record<HarmonyMode, readonly number[]>;
/**
 * The seed followed by its harmonic partners. Lightness and chroma are carried
 * unchanged — rotating hue at constant L in OKLCH is what keeps the whole
 * palette at one perceived brightness.
 *
 * Results are ideal, not gamut-mapped: a rotation at constant L and C often
 * lands outside sRGB, and mapping here would silently desaturate the harmony.
 * Pass the output to `buildRamp`, or call `gamutMap` yourself.
 */
export declare function harmonize(seed: OKLCH, mode: HarmonyMode): OKLCH[];
