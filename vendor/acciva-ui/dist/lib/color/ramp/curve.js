import { RAMP_L_MAX, RAMP_L_MIN } from "./steps.js";
/**
 * Parabolic falloff around the hue's saturation lightness, clamped at zero.
 * Constant chroma down a ramp asks for colours that do not exist at the
 * extremes, and gamut mapping then flattens them all to the same value.
 */
export function chromaCurve(l, cMax, lPeak, sigma) {
    const offset = (l - lPeak) / sigma;
    return Math.max(0, cMax * (1 - offset * offset));
}
/**
 * Width that leaves the far end of the ramp at ~8% of peak chroma, so a
 * dark-peaking hue still gets pale tints and a light-peaking one still gets
 * chromatic shades.
 */
export function sigmaForPeak(lPeak) {
    return Math.max(lPeak - RAMP_L_MIN, RAMP_L_MAX - lPeak) / 0.96;
}
