import type { SurfaceScale, ThemeMode } from "@/lib/color/types";
import { surfaceRole } from "@/lib/color/semantic/roles";
import { SCALES } from "@/lib/color/semantic/tables";
import type { BackgroundRole, SemanticRole } from "@/lib/color/semantic/types";

const ELEVATION_DESCRIPTIONS: readonly string[] = [
  "00dp page canvas",
  "01dp cards and containers",
  "03dp raised buttons and elevated cards",
  "08dp nav drawers and tooltips",
  "24dp dialogs, modals and popovers",
];

export function buildBackgroundRoles(
  surface: SurfaceScale,
  mode: ThemeMode,
): Readonly<Record<BackgroundRole, SemanticRole>> {
  const scale = SCALES[mode];
  const elevation = scale.elevation;

  return {
    canvas: surfaceRole(surface, elevation[0] as number, `${mode} ${ELEVATION_DESCRIPTIONS[0]}`),
    surface: surfaceRole(surface, elevation[1] as number, `${mode} ${ELEVATION_DESCRIPTIONS[1]}`),
    raised: surfaceRole(surface, elevation[2] as number, `${mode} ${ELEVATION_DESCRIPTIONS[2]}`),
    overlay: surfaceRole(surface, elevation[3] as number, `${mode} ${ELEVATION_DESCRIPTIONS[3]}`),
    dialog: surfaceRole(surface, elevation[4] as number, `${mode} ${ELEVATION_DESCRIPTIONS[4]}`),
    inverse: surfaceRole(
      surface,
      scale.inverseBackground,
      "Inverted surface for tooltips and high-emphasis banners",
    ),
  } as const;
}
