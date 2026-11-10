/**
 * Dual contrast engines: WCAG 2.1 relative-luminance ratio and APCA (WCAG 3
 * draft) signed lightness contrast. A semantic pair passes only when BOTH
 * gates pass — see {@link evaluatePair}.
 *
 * WCAG 2.1 gamma expansion, luminance weights and the ratio formula follow
 * `.agents`-level spec section 5 (WCAG 2.1 SC 1.4.3 / 1.4.6 / 1.4.11).
 *
 * APCA constants are the SA98G G-series set for APCA-W3 0.1.9, transcribed
 * from https://github.com/Myndex/apca-w3 (`src/apca-w3.js`, the `SA98G`
 * object and `sRGBtoY` / `APCAcontrast`). Do not "simplify" or re-derive
 * them: every published Lc value depends on these exact numbers.
 */
import { hexToRgb } from "./space.js";
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
/**
 * SA98G constants, APCA-W3 0.1.9 (G-series).
 * Source: https://github.com/Myndex/apca-w3 `src/apca-w3.js`.
 */
const SA98G = {
    mainTRC: 2.4,
    sRco: 0.2126729,
    sGco: 0.7151522,
    sBco: 0.0721750,
    normBG: 0.56,
    normTXT: 0.57,
    revTXT: 0.62,
    revBG: 0.65,
    blkThrs: 0.022,
    blkClmp: 1.414,
    scaleBoW: 1.14,
    scaleWoB: 1.14,
    loBoWoffset: 0.027,
    loWoBoffset: 0.027,
    deltaYmin: 0.0005,
    loClip: 0.1,
};
const APCA_INPUT_CLAMP_LO = 0.0;
const APCA_INPUT_CLAMP_HI = 1.1;
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
function apcaLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const simpleExp = (channel) => Math.pow(channel / 255, SA98G.mainTRC);
    return (SA98G.sRco * simpleExp(r) +
        SA98G.sGco * simpleExp(g) +
        SA98G.sBco * simpleExp(b));
}
function softClampBlackLevel(y) {
    return y > SA98G.blkThrs
        ? y
        : y + Math.pow(SA98G.blkThrs - y, SA98G.blkClmp);
}
/**
 * APCA lightness contrast Lc, signed and polarity-aware.
 * Positive = dark text on a light background; negative = light text on a dark
 * background. Range is roughly -108..+106; 0 means below the reportable floor.
 * The scale is perceptual, not a ratio — never compare it to a WCAG number.
 */
export function apcaLc(textHex, bgHex) {
    const rawTxtY = apcaLuminance(textHex);
    const rawBgY = apcaLuminance(bgHex);
    if (Number.isNaN(rawTxtY) ||
        Number.isNaN(rawBgY) ||
        Math.min(rawTxtY, rawBgY) < APCA_INPUT_CLAMP_LO ||
        Math.max(rawTxtY, rawBgY) > APCA_INPUT_CLAMP_HI) {
        return 0;
    }
    const txtY = softClampBlackLevel(rawTxtY);
    const bgY = softClampBlackLevel(rawBgY);
    if (Math.abs(bgY - txtY) < SA98G.deltaYmin)
        return 0;
    if (bgY > txtY) {
        const sapc = (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) *
            SA98G.scaleBoW;
        return sapc < SA98G.loClip ? 0 : (sapc - SA98G.loBoWoffset) * 100;
    }
    const sapc = (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) *
        SA98G.scaleWoB;
    return sapc > -SA98G.loClip ? 0 : (sapc + SA98G.loWoBoffset) * 100;
}
/** Minimum |Lc| required per use, APCA bronze-tier lookup. */
export const APCA_THRESHOLDS = {
    "body-preferred": 90,
    body: 75,
    "non-body": 60,
    large: 45,
    ui: 30,
    decorative: 15,
};
/** Minimum WCAG 2.1 AA ratio required per use. */
export const WCAG_THRESHOLDS = {
    "body-preferred": 4.5,
    body: 4.5,
    "non-body": 4.5,
    large: 3,
    ui: 3,
    decorative: 0,
};
/** Uses whose WCAG floor is the large-text / non-text scale rather than body. */
const LARGE_TEXT_USES = new Set([
    "large",
    "ui",
    "decorative",
]);
/** Highest APCA tier a signed Lc qualifies for. Polarity-independent. */
export function apcaLevel(lc) {
    const magnitude = Math.abs(lc);
    if (magnitude >= APCA_THRESHOLDS["body-preferred"])
        return "body-preferred";
    if (magnitude >= APCA_THRESHOLDS.body)
        return "body";
    if (magnitude >= APCA_THRESHOLDS["non-body"])
        return "non-body";
    if (magnitude >= APCA_THRESHOLDS.large)
        return "large";
    if (magnitude >= APCA_THRESHOLDS.ui)
        return "ui";
    if (magnitude >= APCA_THRESHOLDS.decorative)
        return "decorative";
    return "invisible";
}
/**
 * Grade a foreground/background pair against both engines for a given use.
 * `passes` is the AND of the two — a pair is only usable when WCAG 2.1 AA and
 * the APCA |Lc| target are both satisfied.
 */
export function evaluatePair(fg, bg, use) {
    const ratio = contrastRatio(fg, bg);
    const requiredRatio = WCAG_THRESHOLDS[use];
    const level = wcagLevel(ratio, LARGE_TEXT_USES.has(use));
    const lc = apcaLc(fg, bg);
    const requiredLc = APCA_THRESHOLDS[use];
    const wcagPasses = ratio >= requiredRatio;
    const apcaPasses = Math.abs(lc) >= requiredLc;
    return {
        foreground: fg,
        background: bg,
        use,
        wcag: { ratio, required: requiredRatio, level, passes: wcagPasses },
        apca: {
            lc,
            tier: apcaLevel(lc),
            required: requiredLc,
            darkOnLight: lc > 0,
            passes: apcaPasses,
        },
        passes: wcagPasses && apcaPasses,
    };
}
