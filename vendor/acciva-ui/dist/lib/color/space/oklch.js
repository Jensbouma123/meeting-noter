/** Below this chroma a colour is grey and its hue carries no information. */
export const CHROMA_EPSILON = 1e-4;
const DEGREES_PER_RADIAN = 180 / Math.PI;
/** Normalise any angle into `[0, 360)`. */
export function normalizeHue(hue) {
    const wrapped = hue % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}
export function oklabToOklch(lab) {
    const c = Math.hypot(lab.a, lab.b);
    return {
        l: lab.l,
        c,
        h: c < CHROMA_EPSILON ? 0 : normalizeHue(Math.atan2(lab.b, lab.a) * DEGREES_PER_RADIAN),
    };
}
export function oklchToOklab(color) {
    const radians = color.h / DEGREES_PER_RADIAN;
    return {
        l: color.l,
        a: color.c * Math.cos(radians),
        b: color.c * Math.sin(radians),
    };
}
/**
 * CSS `oklch(L C H)`. Trailing zeros are trimmed and an achromatic colour always
 * serialises with hue 0, so equivalent greys never produce differing output.
 */
export function formatOklch(color, options) {
    const precision = options?.precision ?? 4;
    const round = (value) => Number(value.toFixed(precision));
    const c = round(color.c);
    return `oklch(${round(color.l)} ${c} ${c === 0 ? 0 : round(normalizeHue(color.h))})`;
}
