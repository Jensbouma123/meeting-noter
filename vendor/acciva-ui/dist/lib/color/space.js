/** Below this chroma a colour is grey and its hue carries no information. */
export const CHROMA_EPSILON = 1e-4;
const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DEGREES_PER_RADIAN = 180 / Math.PI;
/**
 * Exact rational CSS Color 4 primaries expanded to double precision. The
 * truncated 7-digit constants in wide circulation lose ~1e-6 per round trip.
 */
const LINEAR_RGB_TO_XYZ = {
    srgb: [
        [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
        [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
        [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
    ],
    "display-p3": [
        [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
        [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
        [0, 0.045113381858902575, 1.0439443689009757],
    ],
};
const XYZ_TO_LINEAR_RGB = {
    srgb: [
        [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
        [-0.9692436362808796, 1.8759675015077204, 0.0415550574071756],
        [0.05563007969699364, -0.20397695888897652, 1.0569715142428784],
    ],
    "display-p3": [
        [2.493496911941425, -0.9313836179191238, -0.4027107844507169],
        [-0.8294889695615747, 1.762664060318346, 0.023624685841943587],
        [0.03584583024378432, -0.07617238926804168, 0.9568845240076874],
    ],
};
const XYZ_TO_LMS = [
    [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
    [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
    [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_XYZ = [
    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
    [-0.04057574521480088, 1.1122868032803173, -0.07171105806551643],
    [-0.07637293667466004, -0.4214933324022432, 1.5869240198367816],
];
const LMS_TO_OKLAB = [
    [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
    [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
    [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const OKLAB_TO_LMS = [
    [1, 0.396337777376175, 0.2158037573099136],
    [1, -0.10556134581565854, -0.06385417282581334],
    [1, -0.08948417752981182, -1.2914855480194094],
];
function apply(m, x, y, z) {
    return [
        m[0][0] * x + m[0][1] * y + m[0][2] * z,
        m[1][0] * x + m[1][1] * y + m[1][2] * z,
        m[2][0] * x + m[2][1] * y + m[2][2] * z,
    ];
}
/**
 * sRGB electro-optical transfer function, sign-preserving so out-of-gamut
 * candidates survive the round trip instead of folding onto themselves.
 * Display-P3 shares this curve; only the primaries differ.
 */
function decodeChannel(value) {
    const magnitude = Math.abs(value);
    const linear = magnitude <= 0.04045 ? magnitude / 12.92 : ((magnitude + 0.055) / 1.055) ** 2.4;
    return value < 0 ? -linear : linear;
}
function encodeChannel(value) {
    const magnitude = Math.abs(value);
    const encoded = magnitude <= 0.0031308 ? magnitude * 12.92 : 1.055 * magnitude ** (1 / 2.4) - 0.055;
    return value < 0 ? -encoded : encoded;
}
function toByte(value) {
    return Math.min(255, Math.max(0, Math.round(value)));
}
/** Normalise any angle into `[0, 360)`. */
export function normalizeHue(hue) {
    const wrapped = hue % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
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
export function linearRgbToXyz(rgb, gamut = "srgb") {
    const [x, y, z] = apply(LINEAR_RGB_TO_XYZ[gamut], rgb.r, rgb.g, rgb.b);
    return { x, y, z };
}
export function xyzToLinearRgb(xyz, gamut = "srgb") {
    const [r, g, b] = apply(XYZ_TO_LINEAR_RGB[gamut], xyz.x, xyz.y, xyz.z);
    return { r, g, b };
}
export function xyzToOklab(xyz) {
    const [long, medium, short] = apply(XYZ_TO_LMS, xyz.x, xyz.y, xyz.z);
    const [l, a, b] = apply(LMS_TO_OKLAB, Math.cbrt(long), Math.cbrt(medium), Math.cbrt(short));
    return { l, a, b };
}
export function oklabToXyz(lab) {
    const [long, medium, short] = apply(OKLAB_TO_LMS, lab.l, lab.a, lab.b);
    const [x, y, z] = apply(LMS_TO_XYZ, long ** 3, medium ** 3, short ** 3);
    return { x, y, z };
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
export function hexToOklch(hex) {
    return oklabToOklch(xyzToOklab(linearRgbToXyz(srgbToLinear(hexToRgb(hex)))));
}
/**
 * Convert to hex, rounding channels into 0-255. Out-of-gamut input is clamped by
 * that rounding, which shifts hue — call `gamutMap` first for anything that has
 * not been proven in gamut.
 */
export function oklchToHex(color, gamut = "srgb") {
    return rgbToHex(linearToSrgb(xyzToLinearRgb(oklabToXyz(oklchToOklab(color)), gamut)));
}
/**
 * CSS `oklch(L C H)`. Trailing zeros are trimmed and an achromatic colour always
 * serialises with hue 0, so equivalent greys never produce differing output.
 */
export function formatOklch(color, options) {
    var _a;
    const precision = (_a = options === null || options === void 0 ? void 0 : options.precision) !== null && _a !== void 0 ? _a : 4;
    const round = (value) => Number(value.toFixed(precision));
    const c = round(color.c);
    return `oklch(${round(color.l)} ${c} ${c === 0 ? 0 : round(normalizeHue(color.h))})`;
}
