import { clamp } from "@/lib/utils";
import { hexToRgb, normalizeHue, oklchToHex } from "@/lib/color/space/index";
import { hslToRgb } from "@/lib/color/formats/convert";
import type { RGBA } from "@/lib/color/formats/types";

const MAX_INPUT_LENGTH = 96;
const OKLCH_PERCENT_CHROMA = 0.4;
const HEX_INPUT = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_INPUT = /^(rgba?|hsla?|oklch)\(\s*([^()]*?)\s*\)$/i;
const NUMERIC_TOKEN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%|deg)?$/i;

type Token = { value: number; unit: "" | "%" | "deg" };

function parseToken(raw: string): Token | null {
  const match = NUMERIC_TOKEN.exec(raw);
  if (!match) return null;
  return { value: Number(match[1]), unit: (match[2]?.toLowerCase() ?? "") as Token["unit"] };
}

function splitArguments(body: string): string[] | null {
  if (body.includes(",")) {
    const parts = body.split(",").map((part) => part.trim());
    return parts.length === 3 || parts.length === 4 ? parts : null;
  }
  const [channels, alpha, ...extra] = body.split("/");
  if (extra.length > 0) return null;
  const parts = channels.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  if (alpha === undefined) return parts;
  const alphaPart = alpha.trim();
  return alphaPart ? [...parts, alphaPart] : null;
}

function readAlpha(token: Token | undefined): number | null {
  if (!token) return 1;
  if (token.unit === "deg") return null;
  return clamp(token.unit === "%" ? token.value / 100 : token.value, 0, 1);
}

function readHue(token: Token): number | null {
  return token.unit === "%" ? null : normalizeHue(token.value);
}

function readPercent(token: Token): number | null {
  return token.unit === "deg" ? null : clamp(token.value, 0, 100);
}

function parseHex(digits: string): RGBA {
  const expanded = digits.length <= 4 ? digits.replace(/./g, "$&$&") : digits;
  const rgb = hexToRgb(`#${expanded.slice(0, 6)}`);
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6), 16) / 255 : 1;
  return { ...rgb, a };
}

function parseFunction(name: string, tokens: Token[]): RGBA | null {
  const [first, second, third, alphaToken] = tokens;
  const a = readAlpha(alphaToken);
  if (a === null) return null;

  if (name === "rgb" || name === "rgba") {
    const channels = [first, second, third].map((token) => {
      if (token.unit === "deg") return null;
      return clamp(token.unit === "%" ? (token.value / 100) * 255 : token.value, 0, 255);
    });
    if (channels.some((channel) => channel === null)) return null;
    const [r, g, b] = channels as number[];
    return { r, g, b, a };
  }

  if (name === "hsl" || name === "hsla") {
    const h = readHue(first);
    const s = readPercent(second);
    const l = readPercent(third);
    if (h === null || s === null || l === null) return null;
    return hslToRgb({ h, s, l, a });
  }

  const h = readHue(third);
  if (h === null || first.unit === "deg" || second.unit === "deg") return null;
  const l = clamp(first.unit === "%" ? first.value / 100 : first.value, 0, 1);
  const c = Math.max(0, second.unit === "%" ? (second.value / 100) * OKLCH_PERCENT_CHROMA : second.value);
  return { ...hexToRgb(oklchToHex({ l, c, h })), a };
}

/** Strict CSS colour parser: `#hex` (3/4/6/8), `rgb[a]()`, `hsl[a]()`, `oklch()`. Returns `null` on anything else and never throws. */
export function parseColor(input: unknown): RGBA | null {
  if (typeof input !== "string" || input.length > MAX_INPUT_LENGTH) return null;
  const text = input.trim();
  const hex = HEX_INPUT.exec(text);
  if (hex) return parseHex(hex[1]);

  const call = FUNCTION_INPUT.exec(text);
  if (!call) return null;
  const name = call[1].toLowerCase();
  const parts = splitArguments(call[2]);
  if (!parts || (name === "oklch" && call[2].includes(","))) return null;
  const tokens = parts.map(parseToken);
  if (tokens.some((token) => token === null)) return null;
  return parseFunction(name, tokens as Token[]);
}
