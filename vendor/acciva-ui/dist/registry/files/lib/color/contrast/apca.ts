import { hexToRgb } from "@/lib/color/space/index";
import type { Hex, RGB } from "@/lib/color/types";

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
} as const;

const APCA_INPUT_CLAMP_LO = 0.0;
const APCA_INPUT_CLAMP_HI = 1.1;

function apcaLuminance(hex: Hex): number {
  const { r, g, b }: RGB = hexToRgb(hex);
  const simpleExp = (channel: number): number =>
    Math.pow(channel / 255, SA98G.mainTRC);
  return (
    SA98G.sRco * simpleExp(r) +
    SA98G.sGco * simpleExp(g) +
    SA98G.sBco * simpleExp(b)
  );
}

function softClampBlackLevel(y: number): number {
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
export function apcaLc(textHex: Hex, bgHex: Hex): number {
  const rawTxtY = apcaLuminance(textHex);
  const rawBgY = apcaLuminance(bgHex);

  if (
    Number.isNaN(rawTxtY) ||
    Number.isNaN(rawBgY) ||
    Math.min(rawTxtY, rawBgY) < APCA_INPUT_CLAMP_LO ||
    Math.max(rawTxtY, rawBgY) > APCA_INPUT_CLAMP_HI
  ) {
    return 0;
  }

  const txtY = softClampBlackLevel(rawTxtY);
  const bgY = softClampBlackLevel(rawBgY);

  if (Math.abs(bgY - txtY) < SA98G.deltaYmin) return 0;

  if (bgY > txtY) {
    const sapc =
      (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) *
      SA98G.scaleBoW;
    return sapc < SA98G.loClip ? 0 : (sapc - SA98G.loBoWoffset) * 100;
  }

  const sapc =
    (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) *
    SA98G.scaleWoB;
  return sapc > -SA98G.loClip ? 0 : (sapc + SA98G.loWoBoffset) * 100;
}
