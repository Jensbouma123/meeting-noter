import { gamutMap } from "./gamut.js";
import { CHROMA_EPSILON, normalizeHue } from "./space.js";
/**
 * Exactly 26 steps. The label *is* the target lightness times 1000, so
 * `ramp[step].l === step / 1000` holds exactly and callers can address a surface
 * by its lightness. Spacing tightens toward the light end, where tints need the
 * most resolution.
 */
export const RAMP_STEPS = [
    980, 960, 940, 910, 880, 850, 820, 780, 740, 700, 660, 620, 580, 540, 500, 460, 420,
    380, 340, 300, 260, 220, 180, 140, 100, 50,
];
export const RAMP_L_MAX = 0.98;
export const RAMP_L_MIN = 0.05;
/** Tailwind v4's published OKLCH lightness per stop; the source of the aliases. */
const TAILWIND_REFERENCE_L = {
    50: 0.98,
    100: 0.93,
    200: 0.88,
    300: 0.82,
    400: 0.71,
    500: 0.62,
    600: 0.55,
    700: 0.49,
    800: 0.42,
    900: 0.38,
    950: 0.26,
};
/**
 * Tailwind's 11 stops mapped to the nearest of the 26 steps by the reference
 * lightness above. Hardcoded because it is a constant, not work to redo at
 * import time; a test recomputes it so it cannot drift from `RAMP_STEPS`.
 */
export const TAILWIND_ALIASES = {
    50: 980,
    100: 940,
    200: 880,
    300: 820,
    400: 700,
    500: 620,
    600: 540,
    700: 500,
    800: 420,
    900: 380,
    950: 260,
};
/**
 * Lightness at which each hue saturates. Yellow peaks high, blue low. Anchors
 * sit on the sRGB primaries' own OKLCH hues so the table is exact there.
 */
const PEAK_LIGHTNESS_ANCHORS = [
    [0, 0.58],
    [29.234, 0.62],
    [60, 0.72],
    [90, 0.84],
    [109.769, 0.88],
    [142.495, 0.86],
    [170, 0.84],
    [194.769, 0.8],
    [220, 0.62],
    [245, 0.45],
    [264.052, 0.35],
    [290, 0.45],
    [310, 0.55],
    [328.363, 0.62],
    [350, 0.58],
    [360, 0.58],
];
/** Maximum sRGB chroma per hue, exact at each primary's and secondary's hue. */
const MAX_CHROMA_ANCHORS = [
    [0, 0.2],
    [29.234, 0.25768],
    [60, 0.2],
    [90, 0.19],
    [109.769, 0.21101],
    [142.495, 0.29483],
    [170, 0.2],
    [194.769, 0.15455],
    [220, 0.16],
    [245, 0.24],
    [264.052, 0.31321],
    [290, 0.29],
    [310, 0.3],
    [328.363, 0.32249],
    [350, 0.26],
    [360, 0.2],
];
function interpolateAnchors(anchors, hue) {
    const h = normalizeHue(hue);
    for (let i = 1; i < anchors.length; i += 1) {
        const [upperHue, upperValue] = anchors[i];
        if (h > upperHue)
            continue;
        const [lowerHue, lowerValue] = anchors[i - 1];
        const span = upperHue - lowerHue;
        return lowerValue + ((upperValue - lowerValue) * (h - lowerHue)) / span;
    }
    return anchors[anchors.length - 1][1];
}
/**
 * Parabolic falloff around the hue's saturation lightness, clamped at zero.
 * Constant chroma down a ramp asks for colours that do not exist at the
 * extremes, and gamut mapping then flattens them all to the same value.
 */
export function chromaCurve(l, cMax, lPeak, sigma) {
    const offset = (l - lPeak) / sigma;
    return Math.max(0, cMax * (1 - offset * offset));
}
export function peakLightnessForHue(h) {
    return interpolateAnchors(PEAK_LIGHTNESS_ANCHORS, h);
}
export function maxChromaForHue(h) {
    return interpolateAnchors(MAX_CHROMA_ANCHORS, h);
}
/**
 * Width that leaves the far end of the ramp at ~8% of peak chroma, so a
 * dark-peaking hue still gets pale tints and a light-peaking one still gets
 * chromatic shades.
 */
function sigmaForPeak(lPeak) {
    return Math.max(lPeak - RAMP_L_MIN, RAMP_L_MAX - lPeak) / 0.96;
}
/**
 * The seed's 26-step tonal ramp. Lightness is fixed by the step label; chroma
 * follows the hue's curve, scaled so the ramp passes through the seed — a muted
 * seed yields a muted ramp instead of every seed of a hue collapsing onto one
 * palette. Every step is gamut-mapped, so all 26 are guaranteed renderable.
 */
export function buildRamp(seed, gamut = "srgb") {
    const h = normalizeHue(seed.h);
    const ramp = {};
    if (seed.c < CHROMA_EPSILON) {
        for (const step of RAMP_STEPS)
            ramp[step] = { l: step / 1000, c: 0, h };
        return ramp;
    }
    const lPeak = peakLightnessForHue(h);
    const sigma = sigmaForPeak(lPeak);
    const cMax = maxChromaForHue(h);
    const atSeed = chromaCurve(seed.l, cMax, lPeak, sigma);
    const scale = atSeed > 0 ? Math.min(1, seed.c / atSeed) : 1;
    for (const step of RAMP_STEPS) {
        const l = step / 1000;
        ramp[step] = gamutMap({ l, c: chromaCurve(l, cMax * scale, lPeak, sigma), h }, gamut);
    }
    return ramp;
}
