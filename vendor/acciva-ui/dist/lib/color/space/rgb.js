const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/**
 * sRGB electro-optical transfer function, sign-preserving so out-of-gamut
 * candidates survive the round trip instead of folding onto themselves.
 * Display-P3 shares this curve; only the primaries differ.
 */
export function decodeChannel(value) {
    const magnitude = Math.abs(value);
    const linear = magnitude <= 0.04045 ? magnitude / 12.92 : ((magnitude + 0.055) / 1.055) ** 2.4;
    return value < 0 ? -linear : linear;
}
export function encodeChannel(value) {
    const magnitude = Math.abs(value);
    const encoded = magnitude <= 0.0031308 ? magnitude * 12.92 : 1.055 * magnitude ** (1 / 2.4) - 0.055;
    return value < 0 ? -encoded : encoded;
}
function toByte(value) {
    return Math.min(255, Math.max(0, Math.round(value)));
}
/**
 * Parse `#rgb` / `#rrggbb` (leading `#` optional) into 0-255 channels. The only
 * entry point that reads external text: it matches a strict pattern and throws
 * rather than coercing a partial parse.
 */
export function hexToRgb(hex) {
    if (typeof hex !== "string" || !HEX_PATTERN.test(hex)) {
        throw new TypeError(`Invalid hex color: ${String(hex)}`);
    }
    const digits = hex.replace("#", "");
    const expanded = digits.length === 3
        ? digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2]
        : digits;
    const value = Number.parseInt(expanded, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
export function rgbToHex(rgb) {
    const value = (toByte(rgb.r) << 16) | (toByte(rgb.g) << 8) | toByte(rgb.b);
    return `#${value.toString(16).padStart(6, "0")}`;
}
export function srgbToLinear(rgb) {
    return {
        r: decodeChannel(rgb.r / 255),
        g: decodeChannel(rgb.g / 255),
        b: decodeChannel(rgb.b / 255),
    };
}
export function linearToSrgb(rgb) {
    return {
        r: encodeChannel(rgb.r) * 255,
        g: encodeChannel(rgb.g) * 255,
        b: encodeChannel(rgb.b) * 255,
    };
}
