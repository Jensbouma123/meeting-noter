import type { SemanticRoles, ThemeMode, Hex } from "@/lib/color/index";
import { BADGE_PALETTES, type BadgePalette, type ThemeVariable } from "@/lib/theme-tokens/constants";
import type { AppPalette } from "@/lib/theme-tokens/app-palette";
import { paletteVariables, semanticVariables } from "@/lib/theme-tokens/semantic-variables";
import { ROLE_VARIABLES, SOLVABLE_ROLES, badgeBackgroundVariable, type SolvableRole } from "@/lib/theme-tokens/roles";

export type AppTheme = AppPalette & {
  readonly mode: ThemeMode;
  readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
  readonly primary: Hex;
  readonly secondary: Hex;
  readonly accent: Hex;
  readonly background: Hex;
  readonly surface: Hex;
  readonly foreground: Hex;
  readonly mutedForeground: Hex;
  readonly border: Hex;
  readonly focusRing: Hex;
  readonly success: Hex;
  readonly warning: Hex;
  readonly danger: Hex;
  readonly info: Hex;
  readonly elevation: readonly [Hex, Hex, Hex, Hex, Hex];
  /** What each solvable role currently resolves to, keyed the way pairs are. */
  readonly roleColors: Readonly<Record<SolvableRole, Hex>>;
  readonly badgeBackgrounds: Readonly<Record<BadgePalette, Hex>>;
  readonly variables: readonly ThemeVariable[];
};

function roleColorsFrom(read: (name: string) => Hex): Readonly<Record<SolvableRole, Hex>> {
  const colors = {} as Record<SolvableRole, Hex>;
  for (const role of SOLVABLE_ROLES) colors[role] = read(ROLE_VARIABLES[role]);
  return colors;
}

function badgeBackgroundsFrom(read: (name: string) => Hex): Readonly<Record<BadgePalette, Hex>> {
  const fills = {} as Record<BadgePalette, Hex>;
  for (const name of BADGE_PALETTES) fills[name] = read(badgeBackgroundVariable(name));
  return fills;
}

/** The cheap half: picks one mode's roles out of an already-built palette. */
export function resolveAppTheme(palette: AppPalette, mode: ThemeMode): AppTheme {
  const semantic = semanticVariables(palette, mode);
  const byName = new Map(semantic.map((entry) => [entry.name, entry.hex]));
  const read = (name: string): Hex => byName.get(name) ?? "#000000";

  return {
    ...palette,
    mode,
    primary: read(ROLE_VARIABLES.action),
    secondary: read(ROLE_VARIABLES["action-secondary"]),
    accent: read(ROLE_VARIABLES["action-accent"]),
    background: read("--background"),
    surface: read("--surface"),
    foreground: read("--foreground"),
    mutedForeground: read("--muted-foreground"),
    border: read("--border"),
    focusRing: read("--focus-ring"),
    success: read("--success"),
    warning: read("--warning"),
    danger: read("--danger"),
    info: read("--info"),
    elevation: [
      read("--elevation-0"),
      read("--elevation-1"),
      read("--elevation-2"),
      read("--elevation-3"),
      read("--elevation-4"),
    ],
    roleColors: roleColorsFrom(read),
    badgeBackgrounds: badgeBackgroundsFrom(read),
    variables: [...paletteVariables(palette), ...semantic],
  };
}
