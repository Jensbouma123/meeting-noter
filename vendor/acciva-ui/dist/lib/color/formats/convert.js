import { normalizeHue } from "../space/index.js";
export function rgbToHsl({ r, g, b, a }) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const l = (max + min) / 2;
    if (delta === 0)
        return { h: 0, s: 0, l: l * 100, a };
    const s = delta / (1 - Math.abs(2 * l - 1));
    return { h: hueOf(red, green, blue, max, delta), s: s * 100, l: l * 100, a };
}
export function hslToRgb({ h, s, l, a }) {
    const saturation = s / 100;
    const lightness = l / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    return fromChroma(h, chroma, lightness - chroma / 2, a);
}
export function rgbToHsv({ r, g, b, a }) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const delta = max - Math.min(red, green, blue);
    const h = delta === 0 ? 0 : hueOf(red, green, blue, max, delta);
    return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100, a };
}
export function hsvToRgb({ h, s, v, a }) {
    const value = v / 100;
    const chroma = value * (s / 100);
    return fromChroma(h, chroma, value - chroma, a);
}
function hueOf(red, green, blue, max, delta) {
    const sector = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
    return normalizeHue(sector * 60);
}
function fromChroma(h, chroma, offset, a) {
    const sector = normalizeHue(h) / 60;
    const x = chroma * (1 - Math.abs((sector % 2) - 1));
    const [red, green, blue] = sector < 1
        ? [chroma, x, 0]
        : sector < 2
            ? [x, chroma, 0]
            : sector < 3
                ? [0, chroma, x]
                : sector < 4
                    ? [0, x, chroma]
                    : sector < 5
                        ? [x, 0, chroma]
                        : [chroma, 0, x];
    return { r: (red + offset) * 255, g: (green + offset) * 255, b: (blue + offset) * 255, a };
}
