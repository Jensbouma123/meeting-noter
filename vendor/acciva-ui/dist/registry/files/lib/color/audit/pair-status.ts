import { NON_TEXT_SC, TEXT_SC } from "@/lib/color/audit/sc";
import type { RequiredPair, RolePath } from "@/lib/color/audit/types";

export function statusPairs(
  palette: "success" | "warning" | "danger" | "info",
  label: string,
): RequiredPair[] {
  const subtle = `status.${palette}Subtle` as RolePath;
  const border = `status.${palette}Border` as RolePath;
  const base = `status.${palette}` as RolePath;
  const on = `status.on${label}` as RolePath;
  const lower = palette;
  return [
    {
      id: `${lower}-on-subtle`,
      label: `${label} text on its own tinted surface`,
      foreground: base,
      background: subtle,
      use: "body",
      sc: TEXT_SC,
      adjustable: "foreground",
    },
    {
      id: `on-${lower}-on-fill`,
      label: `Label on the solid ${lower} fill`,
      foreground: on,
      background: base,
      use: "body",
      sc: TEXT_SC,
      adjustable: "foreground",
    },
    {
      id: `${lower}-on-canvas`,
      label: `${label} text on the page canvas`,
      foreground: base,
      background: "background.canvas",
      use: "body",
      sc: TEXT_SC,
      adjustable: "foreground",
    },
    {
      id: `${lower}-on-surface`,
      label: `${label} text on a card surface`,
      foreground: base,
      background: "background.surface",
      use: "body",
      sc: TEXT_SC,
      adjustable: "foreground",
    },
    {
      id: `${lower}-border-on-subtle`,
      label: `${label} border against its own tinted surface`,
      foreground: border,
      background: subtle,
      use: "ui",
      sc: NON_TEXT_SC,
      adjustable: "foreground",
    },
    {
      id: `${lower}-border-on-surface`,
      label: `${label} border against a card surface`,
      foreground: border,
      background: "background.surface",
      use: "ui",
      sc: NON_TEXT_SC,
      adjustable: "foreground",
    },
  ];
}
