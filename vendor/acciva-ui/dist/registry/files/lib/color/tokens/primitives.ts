import { formatOklch } from "@/lib/color/space/index";
import { harmonize } from "@/lib/color/harmony";
import { buildRamp } from "@/lib/color/ramp/index";
import type {
  Gamut,
  HarmonyMode,
  OKLCH,
  Ramp,
  SemanticRampSet,
  SurfaceScale,
} from "@/lib/color/types";
import type { DtcgGroup, DtcgToken } from "@/lib/color/tokens/types";

const STATUS_HUES: Readonly<Record<"success" | "warning" | "danger" | "info", number>> = {
  success: 145,
  warning: 85,
  danger: 27,
  info: 240,
};

const STATUS_SEED_L = 0.55;
const STATUS_SEED_C = 0.16;
const NEUTRAL_MAX_CHROMA = 0.012;

export function desaturate(ramp: Ramp, maxChroma: number): Ramp {
  const out: Record<number, OKLCH> = {};
  for (const key of Object.keys(ramp)) {
    const step = Number(key);
    const color = ramp[step] as OKLCH;
    out[step] = { ...color, c: Math.min(color.c, maxChroma) };
  }
  return out;
}

export function harmonyPartner(seed: OKLCH, mode: HarmonyMode): OKLCH {
  const candidates = harmonize(seed, mode);
  const rotated = candidates.find(
    (candidate) => Math.abs(((candidate.h - seed.h) % 360 + 360) % 360) > 1,
  );
  return rotated ?? candidates[candidates.length - 1] ?? seed;
}

export function scaleToGroup(
  scale: Ramp | SurfaceScale,
  name: string,
  precision: number,
): DtcgGroup {
  const group: Record<string, DtcgToken> = {};
  for (const key of Object.keys(scale)) {
    const step = Number(key);
    group[String(step)] = {
      $value: formatOklch(scale[step] as OKLCH, { precision }),
      $type: "color",
      $description: `${name} scale step ${step}`,
    };
  }
  return group;
}

export function buildRampSet(seed: OKLCH, gamut: Gamut, harmony: HarmonyMode): SemanticRampSet {
  const accentSeed = harmonyPartner(seed, harmony);
  return {
    brand: buildRamp(seed, gamut),
    accent: buildRamp(accentSeed, gamut),
    neutral: desaturate(
      buildRamp({ l: seed.l, c: NEUTRAL_MAX_CHROMA, h: seed.h }, gamut),
      NEUTRAL_MAX_CHROMA,
    ),
    success: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.success }, gamut),
    warning: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.warning }, gamut),
    danger: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.danger }, gamut),
    info: buildRamp({ l: STATUS_SEED_L, c: STATUS_SEED_C, h: STATUS_HUES.info }, gamut),
  };
}
