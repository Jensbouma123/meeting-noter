import { CHROMA_EPSILON, normalizeHue, oklabToXyz, oklchToOklab, xyzToLinearRgb, } from "./space/index.js";
const GAMUT_EPSILON = 1e-4;
const MINDE_MIN_ITERATIONS = 10;
const MINDE_RESOLUTION = 1e-4;
/**
 * True when every linear channel lies within `[0, 1]` to 1e-4. Linear rather
 * than gamma-encoded: the encoding compresses the top of the range, so a fixed
 * epsilon would mean different things at different lightnesses.
 */
export function inGamut(c, g) {
    const { r, g: green, b } = xyzToLinearRgb(oklabToXyz(oklchToOklab(c)), g);
    const lower = -GAMUT_EPSILON;
    const upper = 1 + GAMUT_EPSILON;
    return (r >= lower &&
        r <= upper &&
        green >= lower &&
        green <= upper &&
        b >= lower &&
        b <= upper);
}
/**
 * CSS Color 4 Local MINDE: reduce chroma along a constant-L, constant-H line
 * until the colour fits. Clipping RGB channels instead would move all three
 * coordinates and visibly shift hue and lightness.
 *
 * Returns the last chroma *proven* in gamut, so `inGamut(gamutMap(c, g), g)`
 * holds for every input.
 */
export function gamutMap(c, g) {
    const h = normalizeHue(c.h);
    if (c.l >= 1)
        return { l: 1, c: 0, h };
    if (c.l <= 0)
        return { l: 0, c: 0, h };
    const candidate = { l: c.l, c: Math.max(0, c.c), h };
    if (inGamut(candidate, g))
        return candidate;
    let low = 0;
    let high = candidate.c;
    for (let i = 0; i < MINDE_MIN_ITERATIONS || high - low > MINDE_RESOLUTION; i += 1) {
        const mid = (low + high) / 2;
        if (inGamut({ l: candidate.l, c: mid, h }, g))
            low = mid;
        else
            high = mid;
    }
    return { l: candidate.l, c: low, h };
}
/**
 * Interpolate in OKLCH. Hue takes the shortest arc, so 350° to 10° crosses 20°
 * rather than 340°. An achromatic endpoint has a powerless hue and adopts the
 * other endpoint's, keeping grey-to-colour mixes on a single hue line.
 */
export function mixOklch(a, b, t) {
    const amount = Math.min(1, Math.max(0, t));
    const aGrey = a.c < CHROMA_EPSILON;
    const bGrey = b.c < CHROMA_EPSILON;
    let h;
    if (aGrey && bGrey) {
        h = 0;
    }
    else if (aGrey) {
        h = normalizeHue(b.h);
    }
    else if (bGrey) {
        h = normalizeHue(a.h);
    }
    else {
        const from = normalizeHue(a.h);
        const delta = ((normalizeHue(b.h) - from + 540) % 360) - 180;
        h = normalizeHue(from + delta * amount);
    }
    return {
        l: a.l + (b.l - a.l) * amount,
        c: a.c + (b.c - a.c) * amount,
        h,
    };
}
