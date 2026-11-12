import {
  APCA_THRESHOLDS,
  apcaLc,
  apcaLevel,
  contrastRatio,
  gamutMap,
  hexToOklch,
  oklchToHex,
  oklchToOklab,
  wcagLevel,
  type ContrastReport,
  type Hex,
  type OKLCH,
} from "@/lib/color/index";
import { ACTION_LABEL } from "@/lib/theme-tokens/constants";

/** Perceptual distance in OKLab — the space the whole engine already works in. */
function deltaEOk(a: OKLCH, b: OKLCH): number {
  const left = oklchToOklab(a);
  const right = oklchToOklab(b);
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

const SUGGESTION_SAMPLES = 101;

/** Evaluates action contrast of white label (#ffffff) on candidate seed fill. */
function evaluateActionSeed(seed: Hex, target: "AA" | "AAA"): ContrastReport {
  const targetRatio = target === "AAA" ? 7.0 : 4.5;
  const targetLc = target === "AAA" ? APCA_THRESHOLDS["body-preferred"] : APCA_THRESHOLDS.body;
  const ratio = contrastRatio(ACTION_LABEL, seed);
  const lc = apcaLc(ACTION_LABEL, seed);
  const wcagPasses = ratio >= targetRatio;
  const apcaPasses = Math.abs(lc) >= targetLc;

  return {
    foreground: ACTION_LABEL,
    background: seed,
    use: target === "AAA" ? "body-preferred" : "body",
    wcag: {
      ratio,
      required: targetRatio,
      level: wcagLevel(ratio),
      passes: wcagPasses,
    },
    apca: {
      lc,
      tier: apcaLevel(lc),
      required: targetLc,
      darkOnLight: lc > 0,
      passes: apcaPasses,
    },
    passes: wcagPasses && apcaPasses,
  };
}

export type AutoFixSeedResult = {
  readonly seed: Hex;
  readonly adjusted: boolean;
  readonly deltaE: number;
  readonly report: ContrastReport;
};

/**
 * Finds the nearest seed on the same hue and chroma line that clears the target
 * contrast against white action text (#ffffff). If the seed already passes, it is
 * returned unchanged with `adjusted: false` and `deltaE: 0`.
 */
export function autoFixSeedForContrast(
  seed: Hex,
  target: "AA" | "AAA" = "AA",
): {
  seed: Hex;
  adjusted: boolean;
  deltaE: number;
  report: ContrastReport;
} {
  const origin = hexToOklch(seed);
  const initialReport = evaluateActionSeed(seed, target);
  if (initialReport.passes) {
    return {
      seed,
      adjusted: false,
      deltaE: 0,
      report: initialReport,
    };
  }

  let best: { hex: Hex; deltaE: number; report: ContrastReport } | null = null;
  for (let sample = 0; sample < SUGGESTION_SAMPLES; sample += 1) {
    const raw: OKLCH = { l: sample / (SUGGESTION_SAMPLES - 1), c: origin.c, h: origin.h };
    const candidate = gamutMap(raw, "srgb");
    const hex = oklchToHex(candidate);
    const rep = evaluateActionSeed(hex, target);
    if (!rep.passes) continue;
    const distance = deltaEOk(origin, hexToOklch(hex));
    if (best === null || distance < best.deltaE) {
      best = { hex, deltaE: distance, report: rep };
    }
  }

  if (best === null) {
    return {
      seed,
      adjusted: false,
      deltaE: 0,
      report: initialReport,
    };
  }

  return {
    seed: best.hex,
    adjusted: true,
    deltaE: Math.round(best.deltaE * 1000) / 1000,
    report: best.report,
  };
}
