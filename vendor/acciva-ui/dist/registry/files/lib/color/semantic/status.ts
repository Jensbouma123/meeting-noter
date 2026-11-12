import type { SemanticRampSet } from "@/lib/color/types";
import { gatedRole, hexOf, onColorRole, role } from "@/lib/color/semantic/roles";
import type { ModeScale } from "@/lib/color/semantic/tables";
import type { SemanticRole, SemanticRoles, StatusRole } from "@/lib/color/semantic/types";

const STATUS_PALETTES = ["success", "warning", "danger", "info"] as const;

type StatusPalette = (typeof STATUS_PALETTES)[number];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildStatusRoles(
  ramps: SemanticRampSet,
  scale: ModeScale,
  background: SemanticRoles["background"],
): Record<StatusRole, SemanticRole> {
  const canvasHex = hexOf(background.canvas);
  const surfaceHex = hexOf(background.surface);

  return STATUS_PALETTES.reduce<Partial<Record<StatusRole, SemanticRole>>>(
    (accumulator, palette: StatusPalette) => {
      const subtle = role(
        ramps,
        palette,
        scale.status.subtle,
        `${capitalize(palette)} tinted background`,
      );
      const subtleHex = hexOf(subtle);
      const base = gatedRole(
        ramps,
        palette,
        scale.status.base,
        `${capitalize(palette)} state`,
        [{ use: "body", contexts: [subtleHex, canvasHex, surfaceHex] }],
      );
      accumulator[palette] = base;
      accumulator[`${palette}Subtle` as StatusRole] = subtle;
      accumulator[`${palette}Border` as StatusRole] = gatedRole(
        ramps,
        palette,
        scale.status.border,
        `${capitalize(palette)} border`,
        [{ use: "ui", contexts: [subtleHex, surfaceHex] }],
      );
      accumulator[`on${capitalize(palette)}` as StatusRole] = onColorRole(
        ramps,
        base,
        `Text and icons on the ${palette} state`,
      );
      return accumulator;
    },
    {},
  ) as Record<StatusRole, SemanticRole>;
}
