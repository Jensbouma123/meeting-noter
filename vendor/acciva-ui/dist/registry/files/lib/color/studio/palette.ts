import type { RolePath } from "@/lib/color/audit/index";
import type { SemanticRole, SemanticRoles } from "@/lib/color/semantic/index";
import { oklchToHex } from "@/lib/color/space/index";
import type { Hex, OKLCH, PaletteName, Ramp, StepLabel, ThemeMode } from "@/lib/color/types";
import type { AppPalette, AppPaletteName, StatusPaletteName } from "@/lib/theme-tokens/index";
import { MODES } from "@/lib/color/studio/constants";

/** `SemanticRole.palette` names an engine ramp; `AppPalette.ramps` keys it by app name. */
const RAMP_OF_PALETTE: Readonly<Record<PaletteName, AppPaletteName | StatusPaletteName>> = {
  brand: "primary",
  accent: "accent",
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

const ROLE_GROUPS: readonly (keyof SemanticRoles)[] = [
  "background",
  "foreground",
  "border",
  "accent",
  "status",
];

function roleAt(roles: SemanticRoles, path: RolePath): SemanticRole {
  const [group, name] = path.split(".") as [keyof SemanticRoles, string];
  return (roles[group] as Readonly<Record<string, SemanticRole>>)[name] as SemanticRole;
}

/**
 * The elevation surfaces are cut from a `SurfaceScale` whose keys are the
 * elevation ladders, not ramp steps, so `AppPalette.ramps` does not carry it.
 * It is recovered from the roles that alias it — both modes, because the light
 * ladder (980/960/950/930) and the dark one (140…280) are disjoint halves of
 * the same scale. `solveDualMode` reads steps off the scale it is handed, so an
 * elevation role solves exactly the way a ramp role does.
 */
export function surfaceScaleOf(palette: AppPalette): Ramp {
  const scale: Record<StepLabel, OKLCH> = {};
  for (const mode of MODES) {
    const roles = palette.roles[mode];
    for (const group of ROLE_GROUPS) {
      for (const role of Object.values(roles[group]) as readonly SemanticRole[]) {
        if (role.palette === "surface") scale[role.step] = role.color;
      }
    }
  }
  return scale;
}

/** The scale a role's value is drawn from — the vocabulary its solve may use. */
export function rampForRole(palette: AppPalette, path: RolePath): Ramp {
  const name = roleAt(palette.roles.light, path).palette;
  if (name === "surface") return surfaceScaleOf(palette);
  return palette.ramps[RAMP_OF_PALETTE[name]];
}

export function roleHex(palette: AppPalette, mode: ThemeMode, path: RolePath): Hex {
  return oklchToHex(roleAt(palette.roles[mode], path).color);
}

/** The role's own light-mode step: the designer's starting intent before any edit. */
export function defaultIntentFor(palette: AppPalette, path: RolePath): StepLabel {
  return roleAt(palette.roles.light, path).step;
}
