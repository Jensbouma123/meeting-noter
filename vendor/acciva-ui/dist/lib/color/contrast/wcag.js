import { hexToRgb } from "../space/index.js";
export const WCAG_LINEAR_THRESHOLD = 0.04045;
export const WCAG_LINEAR_DIVISOR = 12.92;
export const WCAG_GAMMA_OFFSET = 0.055;
export const WCAG_GAMMA_SCALE = 1.055;
export const WCAG_GAMMA_EXPONENT = 2.4;
export const WCAG_FLARE = 0.05;
export const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;
const LUMA_R = 0.2126729;
const LUMA_G = 0.7151522;
const LUMA_B = 0.0721750;
function expandChannel(channel8Bit) {
    const channel = channel8Bit / 255;
    return channel <= WCAG_LINEAR_THRESHOLD
        ? channel / WCAG_LINEAR_DIVISOR
        : Math.pow((channel + WCAG_GAMMA_OFFSET) / WCAG_GAMMA_SCALE, WCAG_GAMMA_EXPONENT);
}
/** WCAG 2.1 relative luminance Y of an `#rrggbb` colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (LUMA_R * expandChannel(r) +
        LUMA_G * expandChannel(g) +
        LUMA_B * expandChannel(b));
}
/** WCAG 2.1 contrast ratio, 1:1 to 21:1. Order-independent. */
export function contrastRatio(a, b) {
    const ya = relativeLuminance(a);
    const yb = relativeLuminance(b);
    const lighter = Math.max(ya, yb);
    const darker = Math.min(ya, yb);
    return (lighter + WCAG_FLARE) / (darker + WCAG_FLARE);
}
/**
 * WCAG 2.1 conformance level for a ratio. `largeText` switches to the
 * SC 1.4.3 large-text scale (>=18.66px bold or >=24px regular), which is also
 * the SC 1.4.11 non-text scale.
 */
export function wcagLevel(ratio, largeText = false) {
    const aa = largeText ? 3 : WCAG_AA_NORMAL_TEXT_RATIO;
    const aaa = largeText ? 4.5 : 7;
    if (ratio >= aaa)
        return "AAA";
    if (ratio >= aa)
        return "AA";
    return "Fail";
}
