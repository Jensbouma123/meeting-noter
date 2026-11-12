import type { Hex } from "@/lib/color/index";
import { BADGE_PALETTES, type BadgePalette, type TailwindStep } from "@/lib/theme-tokens/constants";
import type { AppTheme } from "@/lib/theme-tokens/app-theme";
import { ROLE_VARIABLES, SOLVABLE_ROLES, badgeBackgroundVariable, type SolvableRole } from "@/lib/theme-tokens/roles";

/**
 * Applies CSS variable overrides to an AppTheme, updating its variables,
 * primitive shade scales (e.g. `--color-primary-800`), and semantic role fields.
 */
export function applyThemeOverrides(
  baseTokens: AppTheme,
  overrides: Record<string, string>,
): AppTheme {
  const overrideEntries = Object.entries(overrides);
  if (overrideEntries.length === 0) return baseTokens;

  const overridesMap = new Map(overrideEntries);
  const variables = baseTokens.variables.map((entry) => {
    const overrideVal = overridesMap.get(entry.name);
    if (overrideVal !== undefined) {
      return {
        name: entry.name,
        hex: overrideVal.startsWith("#") ? (overrideVal as Hex) : entry.hex,
        literal: overrideVal,
      };
    }
    return entry;
  });

  const existingVarNames = new Set(baseTokens.variables.map((v) => v.name));
  for (const [key, val] of overrideEntries) {
    if (!existingVarNames.has(key)) {
      variables.push({
        name: key,
        hex: val.startsWith("#") ? (val as Hex) : (val as Hex),
        literal: val,
      });
    }
  }

  const scales: Record<string, Record<TailwindStep, Hex>> = {};
  for (const [paletteName, paletteScale] of Object.entries(baseTokens.scales)) {
    scales[paletteName] = { ...paletteScale };
  }

  for (const [key, val] of overrideEntries) {
    const match = /^--color-([a-z]+)-(\d+)$/.exec(key);
    if (match) {
      const [, paletteName, stepStr] = match;
      const step = Number(stepStr) as TailwindStep;
      if (paletteName in scales && step in scales[paletteName]) {
        scales[paletteName][step] = val.startsWith("#") ? (val as Hex) : (val as Hex);
      }
    }
  }

  const read = (name: string, fallback: Hex): Hex => {
    const val = overrides[name];
    return val && val.startsWith("#") ? (val as Hex) : fallback;
  };

  // The dedicated button property wins; the primitive step stays honoured so a
  // hand-authored `--color-primary-500` override still moves the action fill.
  const primary = read(ROLE_VARIABLES.action, read("--color-primary-500", baseTokens.primary));
  const secondary = read(
    ROLE_VARIABLES["action-secondary"],
    read("--color-secondary-500", baseTokens.secondary),
  );
  const accent = read(
    ROLE_VARIABLES["action-accent"],
    read("--color-accent-500", baseTokens.accent),
  );

  const roleColors = {} as Record<SolvableRole, Hex>;
  for (const role of SOLVABLE_ROLES) {
    roleColors[role] = read(ROLE_VARIABLES[role], baseTokens.roleColors[role]);
  }
  roleColors.action = primary;
  roleColors["action-secondary"] = secondary;
  roleColors["action-accent"] = accent;

  const badgeBackgrounds = {} as Record<BadgePalette, Hex>;
  for (const name of BADGE_PALETTES) {
    badgeBackgrounds[name] = read(badgeBackgroundVariable(name), baseTokens.badgeBackgrounds[name]);
  }

  return {
    ...baseTokens,
    scales: scales as typeof baseTokens.scales,
    primary,
    secondary,
    accent,
    background: read("--background", baseTokens.background),
    surface: read("--surface", baseTokens.surface),
    foreground: read("--foreground", baseTokens.foreground),
    mutedForeground: read("--muted-foreground", baseTokens.mutedForeground),
    border: read("--border", baseTokens.border),
    focusRing: read("--focus-ring", baseTokens.focusRing),
    success: read("--success", baseTokens.success),
    warning: read("--warning", baseTokens.warning),
    danger: read("--danger", baseTokens.danger),
    info: read("--info", baseTokens.info),
    elevation: [
      read("--elevation-0", baseTokens.elevation[0]),
      read("--elevation-1", baseTokens.elevation[1]),
      read("--elevation-2", baseTokens.elevation[2]),
      read("--elevation-3", baseTokens.elevation[3]),
      read("--elevation-4", baseTokens.elevation[4]),
    ],
    roleColors,
    badgeBackgrounds,
    variables,
  };
}
