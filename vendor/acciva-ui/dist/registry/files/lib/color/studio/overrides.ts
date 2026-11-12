import type { PairResult, RolePath, ThemeAudit } from "@/lib/color/audit/index";
import { cssVariableName, type ModeTokenOverrides } from "@/lib/color/export/resolve/index";
import type { Hex, ThemeMode } from "@/lib/color/types";
import { MODES } from "@/lib/color/studio/constants";
import type { RoleIntentMap, RoleModeHexes } from "@/lib/color/studio/types";

/**
 * What the token graph already holds for every role a pair names, per mode.
 * Read back off the audit rather than off `palette.roles`, so the comparison is
 * against the colours that actually ship — alias indirection and export
 * rounding included — and costs nothing beyond the audit already computed.
 */
export function baselineRoleHexes(audit: ThemeAudit): RoleModeHexes {
  const index: Record<ThemeMode, Partial<Record<RolePath, Hex>>> = { light: {}, dark: {} };
  const collect = (results: readonly PairResult[], mode: ThemeMode) => {
    for (const result of results) {
      index[mode][result.foregroundRole] = result.foreground;
      index[mode][result.backgroundRole] = result.background;
    }
  };
  collect(audit.light, "light");
  collect(audit.dark, "dark");
  return index;
}

/**
 * The per-mode values the designer's decisions move the theme to.
 *
 * Only `state.roles` — decisions the designer actually made — feeds this. The
 * arrival solve deliberately does not: it is anchored on the role's *light*
 * step, so its dark answer is the passing step nearest a light intent rather
 * than the one the theme already ships, and applying it unasked would move
 * every role and fail pairs that were passing. A proposal is not a change.
 *
 * A mode whose solved hex is the one the graph already holds contributes no
 * entry, so the export diff lists real movement only and the audit re-grades
 * nothing it does not have to.
 */
export function roleOverridesFrom(roles: RoleIntentMap, baseline: RoleModeHexes): RoleModeHexes {
  const overrides: Record<ThemeMode, Partial<Record<RolePath, Hex>>> = { light: {}, dark: {} };

  for (const entry of Object.values(roles)) {
    if (entry === undefined || entry.resolution.kind === "unresolved") continue;
    for (const mode of MODES) {
      const hex = entry.resolution.solution[mode].hex;
      // A `null` step has no conformant colour and is never rendered as one.
      if (hex === null || baseline[mode][entry.role] === hex) continue;
      overrides[mode][entry.role] = hex;
    }
  }

  return overrides;
}

/**
 * The same movement as a `ModeTokenOverrides`, which is what the three emitters
 * take. `cssVariableName` drops the mode segment, so both modes address the
 * same property and a per-mode divergence lands as one entry per mode — which
 * is what per-mode overrides exist for.
 */
export function tokenOverridesFrom(overrides: RoleModeHexes): ModeTokenOverrides {
  const emit = (mode: ThemeMode): Record<string, Hex> => {
    const out: Record<string, Hex> = {};
    for (const [role, hex] of Object.entries(overrides[mode])) {
      if (hex === undefined) continue;
      out[cssVariableName(["color", "semantic", "light", ...role.split(".")])] = hex;
    }
    return out;
  };

  return { light: emit("light"), dark: emit("dark") };
}
