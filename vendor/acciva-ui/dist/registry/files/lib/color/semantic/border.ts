import type { SemanticRampSet, SurfaceScale } from "@/lib/color/types";
import { gatedRole, gatedSurfaceRole, hexOf, role } from "@/lib/color/semantic/roles";
import type { ModeScale } from "@/lib/color/semantic/tables";
import type { BorderRole, SemanticRole, SemanticRoles } from "@/lib/color/semantic/types";

export function buildBorderRoles(
  ramps: SemanticRampSet,
  surface: SurfaceScale,
  scale: ModeScale,
  background: SemanticRoles["background"],
  accent: SemanticRoles["accent"],
): Readonly<Record<BorderRole, SemanticRole>> {
  const canvasHex = hexOf(background.canvas);
  const surfaceHex = hexOf(background.surface);
  const raisedHex = hexOf(background.raised);
  const dialogHex = hexOf(background.dialog);
  const elevationHexes = [canvasHex, surfaceHex, raisedHex, dialogHex] as const;
  const fillHexes = [hexOf(accent.brand), hexOf(accent.secondary)] as const;

  /**
   * The outer ring. It must clear 3:1 against every surface a focused control
   * can sit on; clearing the fills it outlines as well is preferred but not
   * always reachable, and the offset ring covers that adjacency instead.
   */
  const focus = gatedRole(
    ramps,
    "brand",
    scale.accent.base,
    "Focus indicator, outer ring (WCAG 2.2 SC 2.4.11 / 2.4.13)",
    [{ use: "ui", contexts: [...elevationHexes] }],
    [{ use: "ui", contexts: [...fillHexes] }],
  );

  /**
   * The inner ring, drawn between the control fill and the outer ring. It is
   * solved against both so the two adjacencies the user actually sees clear
   * 3:1 even when the outer ring cannot be separated from the fill directly.
   */
  const focusOffset = gatedSurfaceRole(
    surface,
    scale.elevation[1] as number,
    "Focus indicator, inner offset ring (WCAG 2.2 SC 2.4.13)",
    [{ use: "ui", contexts: [hexOf(focus), ...fillHexes] }],
  );

  return {
    subtle: role(ramps, "neutral", scale.border.subtle, "Hairline separator"),
    default: gatedRole(
      ramps,
      "neutral",
      scale.border.default,
      "Default control border",
      [{ use: "ui", contexts: [canvasHex, surfaceHex, raisedHex] }],
    ),
    strong: gatedRole(
      ramps,
      "neutral",
      scale.border.strong,
      "Emphasised border",
      [{ use: "ui", contexts: [canvasHex, surfaceHex] }],
    ),
    focus,
    focusOffset,
  } as const;
}
