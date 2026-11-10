import { normalizeHue } from "../space/index.js";
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
export function peakLightnessForHue(h) {
    return interpolateAnchors(PEAK_LIGHTNESS_ANCHORS, h);
}
export function maxChromaForHue(h) {
    return interpolateAnchors(MAX_CHROMA_ANCHORS, h);
}
