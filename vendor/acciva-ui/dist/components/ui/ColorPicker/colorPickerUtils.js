import { formatColor, hsvToRgb, parseColor, rgbaToHex, rgbToHsv, } from "../../../lib/color/formats/index.js";
import { DEFAULT_SEED } from "../../../lib/theme-tokens/index.js";
import { clamp } from "../../../lib/utils.js";
export const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
export const PANEL_TITLE = "Choose color";
export const LARGE_STEP = 10;
export const LIGHT_GLYPH_LUMINANCE = 0.179;
const FALLBACK_RGBA = parseColor(DEFAULT_SEED);
export const FORMATS = ["hex", "rgb", "hsl"];
export const HUE_GRADIENT = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360]
    .map((h) => rgbaToHex(hsvToRgb({ h, s: 100, v: 100, a: 1 })))
    .join(", ")})`;
export const CHECKERBOARD = "repeating-conic-gradient(var(--color-neutral-200) 0% 25%, var(--color-neutral-50) 0% 50%)";
export const CHECKER_TILE = "calc(var(--spacing) * 4) calc(var(--spacing) * 4)";
export const THUMB_PAINT = "pointer-events-none block rounded-full border-2 border-neutral-50 shadow ring-1 ring-neutral-950";
export function roundRgba({ r, g, b, a }) {
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a * 100) / 100 };
}
export function roundHsla({ h, s, l, a }) {
    return { h: Math.round(h) % 360, s: Math.round(s), l: Math.round(l), a };
}
export function toHsva(rgba, fallbackHue) {
    const hsva = rgbToHsv(rgba);
    return hsva.s === 0 || hsva.v === 0 ? { ...hsva, h: fallbackHue } : hsva;
}
export function hsvaFromValue(value, allowAlpha, fallbackHue) {
    const rgba = parseColor(value) ?? FALLBACK_RGBA;
    return toHsva(allowAlpha ? rgba : { ...rgba, a: 1 }, fallbackHue);
}
export function cssColor(rgba) {
    return formatColor(rgba, "rgb");
}
export function checkeredFill(rgba) {
    const fill = cssColor(rgba);
    return {
        backgroundImage: `linear-gradient(${fill}, ${fill}), ${CHECKERBOARD}`,
        backgroundSize: `100% 100%, ${CHECKER_TILE}`,
    };
}
export function resolveSwatches(swatches) {
    if (!swatches)
        return [];
    return swatches.flatMap((swatch) => {
        const entry = typeof swatch === "string" ? { value: swatch } : swatch;
        const rgba = parseColor(entry.value);
        if (!rgba)
            return [];
        const serialized = rgbaToHex(rgba);
        return [{ rgba, label: entry.label ?? serialized }];
    });
}
export function trackDrag(event, element, onPoint) {
    if (!element || event.button !== 0)
        return;
    event.preventDefault();
    const update = (clientX, clientY) => {
        const rect = element.getBoundingClientRect();
        onPoint(clamp((clientX - rect.left) / (rect.width || 1), 0, 1), clamp((clientY - rect.top) / (rect.height || 1), 0, 1));
    };
    update(event.clientX, event.clientY);
    const move = (moveEvent) => update(moveEvent.clientX, moveEvent.clientY);
    const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
}
export function stepFor(event) {
    return event.shiftKey ? LARGE_STEP : 1;
}
