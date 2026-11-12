import { REQUIRED_PAIRS, gradePair, type PairResult, type RequiredPair, type ThemeAudit } from "@/lib/color/audit/index";
import type { ThemeMode } from "@/lib/color/types";
import { MODES } from "@/lib/color/studio/constants";
import type { RoleModeHexes } from "@/lib/color/studio/types";

function hasOverrides(overrides: RoleModeHexes): boolean {
  return MODES.some((mode) => Object.keys(overrides[mode]).length > 0);
}

const PAIR_BY_ID: ReadonlyMap<string, RequiredPair> = new Map(
  REQUIRED_PAIRS.map((pair) => [pair.id, pair]),
);

/**
 * The audit the gate reads: the seed's verdict with the designer's overrides
 * applied.
 *
 * This is the whole point. `auditTokenGraph` grades the graph the seed built,
 * which knows nothing about a role the designer moved — so a resolved role's
 * fix used to be invisible to `passesAA` in both directions: a fix could not
 * open the gate, and a regression could not close it. The gate has to grade the
 * colours that will be emitted, and the emitted colours are graph plus
 * overrides.
 *
 * It re-grades **only the rows an override touches**, and returns `base`
 * unchanged when there are none, so the 124-verdict pass stays keyed on the
 * seed. Every untouched `PairResult` is passed through by reference.
 */
export function applyRoleOverrides(base: ThemeAudit, overrides: RoleModeHexes): ThemeAudit {
  if (!hasOverrides(overrides)) return base;

  const regrade = (results: readonly PairResult[], mode: ThemeMode): readonly PairResult[] => {
    const forMode = overrides[mode];
    if (Object.keys(forMode).length === 0) return results;

    return results.map((result) => {
      const foreground = forMode[result.foregroundRole];
      const background = forMode[result.backgroundRole];
      if (foreground === undefined && background === undefined) return result;

      const pair = PAIR_BY_ID.get(result.id);
      if (pair === undefined) return result;

      return gradePair(
        pair,
        mode,
        foreground ?? result.foreground,
        background ?? result.background,
      );
    });
  };

  const light = regrade(base.light, "light");
  const dark = regrade(base.dark, "dark");
  const failures = [...light, ...dark].filter((result) => !result.pass && !result.exempt);

  return { ...base, light, dark, failures, passesAA: failures.length === 0 };
}
