import type { SemanticRampSet, SurfaceScale, ThemeMode } from "@/lib/color/types";
import { buildAccentRoles } from "@/lib/color/semantic/accent";
import { buildBackgroundRoles } from "@/lib/color/semantic/background";
import { buildBorderRoles } from "@/lib/color/semantic/border";
import { buildForegroundRoles } from "@/lib/color/semantic/foreground";
import { buildStatusRoles } from "@/lib/color/semantic/status";
import { SCALES } from "@/lib/color/semantic/tables";
import { buildSurfaceScale, seedHue } from "@/lib/color/semantic/surface";
import type { SemanticRoles } from "@/lib/color/semantic/types";

/**
 * Maps a full ramp set onto context-aware roles for one theme mode. Dark mode
 * is derived independently from the same primitives — it is never an inversion
 * of the light roles.
 *
 * Roles that WCAG 2.2 AA gates are solved against the colours they are actually
 * rendered on, in the order those colours become available: tinted backgrounds
 * before the text and borders that sit on them, fills before the focus ring
 * that outlines them. Roles WCAG does not regulate — `border.subtle`,
 * `foreground.disabled`, the hover and subtle fills — keep their intent step.
 */
export function buildSemanticRoles(
  ramps: SemanticRampSet,
  mode: ThemeMode,
  surface: SurfaceScale = buildSurfaceScale(seedHue(ramps)),
): SemanticRoles {
  const scale = SCALES[mode];
  const background = buildBackgroundRoles(surface, mode);
  const accent = buildAccentRoles(ramps, scale, background);
  const border = buildBorderRoles(ramps, surface, scale, background, accent);
  const foreground = buildForegroundRoles(ramps, scale, background);
  const status = buildStatusRoles(ramps, scale, background);

  return { background, foreground, border, accent, status };
}
