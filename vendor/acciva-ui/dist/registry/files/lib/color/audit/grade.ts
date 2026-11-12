import { apcaLc, apcaLevel, contrastRatio, WCAG_THRESHOLDS, wcagLevel } from "@/lib/color/contrast/index";
import type { FlatToken } from "@/lib/color/export/resolve/index";
import type { Hex, OKLCH, ThemeMode } from "@/lib/color/types";
import { REQUIRED_PAIRS } from "@/lib/color/audit/pairs";
import type { GateUse, PairResult, RequiredPair, RolePath } from "@/lib/color/audit/types";

/** Body text is the only use held to the 4.5:1 scale; everything else is the 3:1 scale. */
function isLargeScale(use: GateUse): boolean {
  return use !== "body";
}

/**
 * Grade one pair from explicit hexes. Exposed so a caller that already has
 * resolved colours — an override editor, a test — can reuse the exact gate the
 * theme audit applies, without rebuilding a token graph.
 *
 * `pass` is `ratio >= required` with no other term. There is no lightness
 * window, no polarity special case and no APCA clause that can turn a failing
 * ratio into a pass.
 */
export function gradePair(
  pair: RequiredPair,
  mode: ThemeMode,
  foreground: Hex,
  background: Hex,
): PairResult {
  const ratio = contrastRatio(foreground, background);
  const required = WCAG_THRESHOLDS[pair.use];
  const lc = apcaLc(foreground, background);

  return {
    id: pair.id,
    label: pair.label,
    mode,
    use: pair.use,
    foregroundRole: pair.foreground,
    backgroundRole: pair.background,
    foreground,
    background,
    ratio,
    required,
    level: wcagLevel(ratio, isLargeScale(pair.use)),
    pass: ratio >= required,
    exempt: pair.exempt === true,
    sc: pair.sc,
    adjustable: pair.adjustable,
    apca: { lc, tier: apcaLevel(lc) },
  };
}

type RoleResolution = { readonly hex: Hex; readonly color: OKLCH };

const SEMANTIC_LAYER_INDEX = 1;
const ROLE_PATH_START = 3;

export function roleIndex(tokens: readonly FlatToken[]): Map<string, RoleResolution> {
  const index = new Map<string, RoleResolution>();
  for (const token of tokens) {
    if (token.path[SEMANTIC_LAYER_INDEX] !== "semantic") continue;
    const key = token.path.slice(ROLE_PATH_START).join(".");
    if (key.length === 0) continue;
    index.set(key, { hex: token.hex, color: token.color });
  }
  return index;
}

function requireRole(
  index: Map<string, RoleResolution>,
  path: RolePath,
  mode: ThemeMode,
): RoleResolution {
  const resolved = index.get(path);
  if (resolved === undefined) {
    throw new Error(`Required pair references unknown ${mode} role ${path}`);
  }
  return resolved;
}

export function gradeMode(
  index: Map<string, RoleResolution>,
  mode: ThemeMode,
): PairResult[] {
  return REQUIRED_PAIRS.map((pair) =>
    gradePair(
      pair,
      mode,
      requireRole(index, pair.foreground, mode).hex,
      requireRole(index, pair.background, mode).hex,
    ),
  );
}
