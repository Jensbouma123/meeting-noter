import type { Gamut, OKLCH } from "./types.js";
/**
 * True when every linear channel lies within `[0, 1]` to 1e-4. Linear rather
 * than gamma-encoded: the encoding compresses the top of the range, so a fixed
 * epsilon would mean different things at different lightnesses.
 */
export declare function inGamut(c: OKLCH, g: Gamut): boolean;
/**
 * CSS Color 4 Local MINDE: reduce chroma along a constant-L, constant-H line
 * until the colour fits. Clipping RGB channels instead would move all three
 * coordinates and visibly shift hue and lightness.
 *
 * Returns the last chroma *proven* in gamut, so `inGamut(gamutMap(c, g), g)`
 * holds for every input.
 */
export declare function gamutMap(c: OKLCH, g: Gamut): OKLCH;
/**
 * Interpolate in OKLCH. Hue takes the shortest arc, so 350° to 10° crosses 20°
 * rather than 340°. An achromatic endpoint has a powerless hue and adopts the
 * other endpoint's, keeping grey-to-colour mixes on a single hue line.
 */
export declare function mixOklch(a: OKLCH, b: OKLCH, t: number): OKLCH;
