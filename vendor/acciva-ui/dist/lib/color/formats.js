import { hexToRgb, normalizeHue, oklchToHex } from "./space.js";
const MAX_INPUT_LENGTH = 96;
const OKLCH_PERCENT_CHROMA = 0.4;
const HEX_INPUT = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_INPUT = /^(rgba?|hsla?|oklch)\(\s*([^()]*?)\s*\)$/i;
const NUMERIC_TOKEN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%|deg)?$/i;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
function parseToken(raw) {
    var _a, _b;
    const match = NUMERIC_TOKEN.exec(raw);
    if (!match)
        return null;
    return { value: Number(match[1]), unit: ((_b = (_a = match[2]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "") };
}
function splitArguments(body) {
    if (body.includes(",")) {
        const parts = body.split(",").map((part) => part.trim());
        return parts.length === 3 || parts.length === 4 ? parts : null;
    }
    const [channels, alpha, ...extra] = body.split("/");
    if (extra.length > 0)
        return null;
    const parts = channels.trim().split(/\s+/);
    if (parts.length !== 3)
        return null;
    if (alpha === undefined)
        return parts;
    const alphaPart = alpha.trim();
    return alphaPart ? [...parts, alphaPart] : null;
}
function readAlpha(token) {
    if (!token)
        return 1;
    if (token.unit === "deg")
        return null;
    return clamp(token.unit === "%" ? token.value / 100 : token.value, 0, 1);
}
function readHue(token) {
    return token.unit === "%" ? null : normalizeHue(token.value);
}
function readPercent(token) {
    return token.unit === "deg" ? null : clamp(token.value, 0, 100);
}
function parseHex(digits) {
    const expanded = digits.length <= 4 ? digits.replace(/./g, "$&$&") : digits;
    const rgb = hexToRgb(`#${expanded.slice(0, 6)}`);
    const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6), 16) / 255 : 1;
    return Object.assign(Object.assign({}, rgb), { a });
}
function parseFunction(name, tokens) {
    const [first, second, third, alphaToken] = tokens;
    const a = readAlpha(alphaToken);
    if (a === null)
        return null;
    if (name === "rgb" || name === "rgba") {
        const channels = [first, second, third].map((token) => {
            if (token.unit === "deg")
                return null;
            return clamp(token.unit === "%" ? (token.value / 100) * 255 : token.value, 0, 255);
        });
        if (channels.some((channel) => channel === null))
            return null;
        const [r, g, b] = channels;
        return { r, g, b, a };
    }
    if (name === "hsl" || name === "hsla") {
        const h = readHue(first);
        const s = readPercent(second);
        const l = readPercent(third);
        if (h === null || s === null || l === null)
            return null;
        return hslToRgb({ h, s, l, a });
    }
    const h = readHue(third);
    if (h === null || first.unit === "deg" || second.unit === "deg")
        return null;
    const l = clamp(first.unit === "%" ? first.value / 100 : first.value, 0, 1);
    const c = Math.max(0, second.unit === "%" ? (second.value / 100) * OKLCH_PERCENT_CHROMA : second.value);
    return Object.assign(Object.assign({}, hexToRgb(oklchToHex({ l, c, h }))), { a });
}
/** Strict CSS colour parser: `#hex` (3/4/6/8), `rgb[a]()`, `hsl[a]()`, `oklch()`. Returns `null` on anything else and never throws. */
export function parseColor(input) {
    if (typeof input !== "string" || input.length > MAX_INPUT_LENGTH)
        return null;
    const text = input.trim();
    const hex = HEX_INPUT.exec(text);
    if (hex)
        return parseHex(hex[1]);
    const call = FUNCTION_INPUT.exec(text);
    if (!call)
        return null;
    const name = call[1].toLowerCase();
    const parts = splitArguments(call[2]);
    if (!parts || (name === "oklch" && call[2].includes(",")))
        return null;
    const tokens = parts.map(parseToken);
    if (tokens.some((token) => token === null))
        return null;
    return parseFunction(name, tokens);
}
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
const toByte = (value) => clamp(Math.round(value), 0, 255);
const toHexByte = (value) => toByte(value).toString(16).padStart(2, "0");
const roundAlpha = (a) => Math.round(clamp(a, 0, 1) * 100) / 100;
export function rgbaToHex(rgba, alpha = true) {
    const rgb = `#${toHexByte(rgba.r)}${toHexByte(rgba.g)}${toHexByte(rgba.b)}`;
    return alpha && roundAlpha(rgba.a) < 1 ? rgb + toHexByte(rgba.a * 255) : rgb;
}
export function formatColor(rgba, format, options) {
    const a = (options === null || options === void 0 ? void 0 : options.alpha) === false ? 1 : roundAlpha(rgba.a);
    if (format === "hex")
        return rgbaToHex(Object.assign(Object.assign({}, rgba), { a }));
    if (format === "rgb") {
        const channels = `${toByte(rgba.r)}, ${toByte(rgba.g)}, ${toByte(rgba.b)}`;
        return a < 1 ? `rgba(${channels}, ${a})` : `rgb(${channels})`;
    }
    const hsl = rgbToHsl({ r: toByte(rgba.r), g: toByte(rgba.g), b: toByte(rgba.b), a });
    const channels = `${Math.round(hsl.h) % 360}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`;
    return a < 1 ? `hsla(${channels}, ${a})` : `hsl(${channels})`;
}
