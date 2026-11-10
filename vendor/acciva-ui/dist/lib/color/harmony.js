import { normalizeHue } from "./space.js";
/**
 * Hue offsets in degrees, applied to the seed. `monochromatic` holds the hue and
 * walks lightness instead, so it carries no offsets.
 */
export const HARMONY_OFFSETS = {
    complementary: [180],
    analogous: [-30, 30],
    triadic: [120, 240],
    "split-complementary": [150, 210],
    tetradic: [60, 180, 240],
    monochromatic: [],
};
const MONOCHROMATIC_LIGHTNESS_OFFSETS = [-0.22, 0.16, 0.3];
const MONOCHROMATIC_L_MIN = 0.05;
const MONOCHROMATIC_L_MAX = 0.98;
const MONOCHROMATIC_CHROMA_DAMPING = 0.8;
function monochromatic(seed) {
    const h = normalizeHue(seed.h);
    return MONOCHROMATIC_LIGHTNESS_OFFSETS.map((offset) => ({
        l: Math.min(MONOCHROMATIC_L_MAX, Math.max(MONOCHROMATIC_L_MIN, seed.l + offset)),
        c: seed.c * (1 - MONOCHROMATIC_CHROMA_DAMPING * Math.abs(offset)),
        h,
    }));
}
/**
 * The seed followed by its harmonic partners. Lightness and chroma are carried
 * unchanged — rotating hue at constant L in OKLCH is what keeps the whole
 * palette at one perceived brightness.
 *
 * Results are ideal, not gamut-mapped: a rotation at constant L and C often
 * lands outside sRGB, and mapping here would silently desaturate the harmony.
 * Pass the output to `buildRamp`, or call `gamutMap` yourself.
 */
export function harmonize(seed, mode) {
    const base = { l: seed.l, c: seed.c, h: normalizeHue(seed.h) };
    if (mode === "monochromatic")
        return [base, ...monochromatic(base)];
    return [
        base,
        ...HARMONY_OFFSETS[mode].map((offset) => ({
            l: base.l,
            c: base.c,
            h: normalizeHue(base.h + offset),
        })),
    ];
}
