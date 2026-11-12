import {
  formatOklch,
  oklchToHex,
  type BackgroundRole,
  type BorderRole,
  type ForegroundRole,
  type OKLCH,
  type SemanticRole,
  type SemanticRoles,
  type StatusRole,
  type ThemeMode,
} from "@/lib/color/index";
import {
  APP_PALETTES,
  STATUS_PALETTES,
  TAILWIND_STEPS,
  type AppPaletteName,
  type StatusPaletteName,
  type ThemeVariable,
} from "@/lib/theme-tokens/constants";
import type { AppPalette } from "@/lib/theme-tokens/app-palette";
import { DERIVED_VARIABLES } from "@/lib/theme-tokens/derived-variables";

type SemanticVariableSpec = { readonly name: string } & (
  | { readonly group: "background"; readonly role: BackgroundRole }
  | { readonly group: "foreground"; readonly role: ForegroundRole }
  | { readonly group: "border"; readonly role: BorderRole }
  | { readonly group: "status"; readonly role: StatusRole }
);

/**
 * The flat properties every component styles against. Elevation follows the
 * engine's ladder: in light mode the canvas is the *darkest* surface and layers
 * rise toward white, which is what makes a raised hover state visible without a
 * shadow.
 */
const SEMANTIC_VARIABLES: readonly SemanticVariableSpec[] = [
  { name: "--background", group: "background", role: "canvas" },
  { name: "--surface", group: "background", role: "surface" },
  { name: "--foreground", group: "foreground", role: "primary" },
  { name: "--muted-foreground", group: "foreground", role: "secondary" },
  { name: "--border", group: "border", role: "default" },
  { name: "--focus-ring", group: "border", role: "focus" },
  { name: "--success", group: "status", role: "success" },
  { name: "--warning", group: "status", role: "warning" },
  { name: "--danger", group: "status", role: "danger" },
  { name: "--info", group: "status", role: "info" },
  { name: "--elevation-0", group: "background", role: "canvas" },
  { name: "--elevation-1", group: "background", role: "surface" },
  { name: "--elevation-2", group: "background", role: "raised" },
  { name: "--elevation-3", group: "background", role: "overlay" },
  { name: "--elevation-4", group: "background", role: "dialog" },
];

function roleOf(roles: SemanticRoles, spec: SemanticVariableSpec): SemanticRole {
  switch (spec.group) {
    case "background":
      return roles.background[spec.role];
    case "foreground":
      return roles.foreground[spec.role];
    case "border":
      return roles.border[spec.role];
    case "status":
      return roles.status[spec.role];
  }
}

function variable(name: string, color: OKLCH): ThemeVariable {
  return { name, hex: oklchToHex(color), literal: formatOklch(color) };
}

/** `--color-<palette>-<stop>`, identical in both modes: a ramp has no mode. */
export function paletteVariables(palette: AppPalette): ThemeVariable[] {
  const variables: ThemeVariable[] = [];
  const paletteNames: readonly (AppPaletteName | StatusPaletteName)[] = [
    ...APP_PALETTES,
    ...STATUS_PALETTES,
  ];
  for (const name of paletteNames) {
    for (const stop of TAILWIND_STEPS) {
      variables.push(
        variable(`--color-${name}-${stop}`, palette.ramps[name][palette.aliases[stop]] as OKLCH),
      );
    }
  }
  return variables;
}

export function semanticVariables(palette: AppPalette, mode: ThemeMode): ThemeVariable[] {
  const roles = palette.roles[mode];
  return [
    ...SEMANTIC_VARIABLES.map((spec) => variable(spec.name, roleOf(roles, spec).color)),
    ...DERIVED_VARIABLES.map((spec) => variable(spec.name, spec.pick(palette, mode))),
  ];
}
