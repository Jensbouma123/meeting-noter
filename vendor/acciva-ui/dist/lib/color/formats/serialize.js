import { clamp } from "../../utils.js";
import { rgbToHsl } from "./convert.js";
const toByte = (value) => clamp(Math.round(value), 0, 255);
const toHexByte = (value) => toByte(value).toString(16).padStart(2, "0");
const roundAlpha = (a) => Math.round(clamp(a, 0, 1) * 100) / 100;
export function rgbaToHex(rgba, alpha = true) {
    const rgb = `#${toHexByte(rgba.r)}${toHexByte(rgba.g)}${toHexByte(rgba.b)}`;
    return alpha && roundAlpha(rgba.a) < 1 ? rgb + toHexByte(rgba.a * 255) : rgb;
}
export function formatColor(rgba, format, options) {
    const a = options?.alpha === false ? 1 : roundAlpha(rgba.a);
    if (format === "hex")
        return rgbaToHex({ ...rgba, a });
    if (format === "rgb") {
        const channels = `${toByte(rgba.r)}, ${toByte(rgba.g)}, ${toByte(rgba.b)}`;
        return a < 1 ? `rgba(${channels}, ${a})` : `rgb(${channels})`;
    }
    const hsl = rgbToHsl({ r: toByte(rgba.r), g: toByte(rgba.g), b: toByte(rgba.b), a });
    const channels = `${Math.round(hsl.h) % 360}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;
    return a < 1 ? `hsla(${channels}, ${a})` : `hsl(${channels})`;
}
