import { contrastRatio, type ContrastUse, type Hex } from "@/lib/color/index";
import { ACTION_LABEL } from "@/lib/theme-tokens/constants";
import type { AppTheme } from "@/lib/theme-tokens/app-theme";
import type { AdjustableTarget, ContrastRoleCategory } from "@/lib/theme-tokens/contrast-thresholds";
import type { SolvableRole } from "@/lib/theme-tokens/roles";

export type PairSpec = {
  readonly id: SolvableRole;
  readonly label: string;
  readonly use: ContrastUse;
  readonly category: ContrastRoleCategory;
  readonly adjustableTarget: AdjustableTarget;
  readonly pick: (theme: AppTheme) => readonly [Hex, Hex];
};

/**
 * The offset ring is one colour but sits against three different button fills,
 * and a pair carries one background. Grading it against whichever fill it
 * currently separates worst keeps the single pair honest: the binding adjacency
 * is the one reported, so no fill can hide behind an easier sibling, and a
 * solve that clears this one clears the rest by construction.
 */
function tightestActionFill(theme: AppTheme): Hex {
  const ring = theme.roleColors["focus-offset"];
  let tightest = theme.roleColors.action;
  let lowest = contrastRatio(ring, tightest);
  for (const role of ["action-secondary", "action-accent"] as const) {
    const fill = theme.roleColors[role];
    const ratio = contrastRatio(ring, fill);
    if (ratio < lowest) {
      lowest = ratio;
      tightest = fill;
    }
  }
  return tightest;
}

/**
 * Which of the two backgrounds `foreground.muted` is gated against reads it
 * worse. The two swap by mode — the light canvas is darker than the card it
 * carries, the dark canvas lighter — so naming one of them in the pair would
 * over-report in whichever mode the other is binding.
 */
function tighterTextGround(theme: AppTheme, foreground: Hex): Hex {
  return contrastRatio(foreground, theme.background) <= contrastRatio(foreground, theme.surface)
    ? theme.background
    : theme.surface;
}

/**
 * Every pair reads its foreground (or, for an action fill, its background) out
 * of `roleColors`, so the colour graded here is the colour the role's own
 * property carries — a solved override shows up in the next grade instead of
 * being masked by the primitive step it was derived from.
 *
 * Order matters for `solveAllContrastPairs`, which folds each fix in before
 * reading the next pair: the action fills come before the offset ring that is
 * measured against them, and the offset ring before the outer focus ring that
 * is measured against it.
 */
export const PAIR_SPECS: readonly PairSpec[] = [
  { id: "body", label: "Body text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.body, t.background] },
  { id: "body-surface", label: "Body text on card surface", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["body-surface"], t.surface] },
  { id: "muted", label: "Muted text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.muted, t.background] },
  {
    id: "subtle",
    label: "Subtle text on whichever of canvas and card surface reads it worse",
    use: "body",
    category: "text",
    adjustableTarget: "foreground",
    pick: (t) => [t.roleColors.subtle, tighterTextGround(t, t.roleColors.subtle)],
  },
  { id: "action", label: "Action label on primary fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors.action] },
  { id: "action-secondary", label: "Action label on secondary fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors["action-secondary"]] },
  { id: "action-accent", label: "Action label on accent fill", use: "body", category: "action-fill", adjustableTarget: "background", pick: (t) => [ACTION_LABEL, t.roleColors["action-accent"]] },
  { id: "link", label: "Link on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.link, t.background] },
  {
    id: "brand",
    label: "Brand foreground on whichever of canvas and card surface reads it worse",
    use: "body",
    category: "text",
    adjustableTarget: "foreground",
    pick: (t) => [t.roleColors.brand, tighterTextGround(t, t.roleColors.brand)],
  },
  { id: "badge", label: "Badge label on tinted badge", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.badge, t.badgeBackgrounds.primary] },
  { id: "focus", label: "Focus ring against canvas", use: "ui", category: "focus", adjustableTarget: "foreground", pick: (t) => [t.roleColors.focus, t.background] },
  { id: "focus-surface", label: "Focus ring against card surface", use: "ui", category: "focus", adjustableTarget: "foreground", pick: (t) => [t.roleColors["focus-surface"], t.surface] },
  {
    // SC 2.4.13: the indicator has to be visible against the control it
    // surrounds, not only against the page behind it — a ring that inherits the
    // accent it outlines indicates nothing. What touches the fill, though, is
    // the offset ring, not the outer ring: the theme paints
    // `fill | offset | outer | surface`, so this is the adjacency a keyboard
    // user actually sees, and the one the offset ring is solved for.
    id: "focus-offset",
    label: "Focus offset ring against the control fill it outlines",
    use: "ui",
    category: "focus",
    adjustableTarget: "foreground",
    pick: (t) => [t.roleColors["focus-offset"], tightestActionFill(t)],
  },
  {
    // The other half of that chain. Grading the outer ring straight against the
    // fill measured an inset ring the theme never paints, and in dark mode no
    // colour could satisfy it; the offset ring between them is what the outer
    // ring is read against.
    id: "focus-control",
    label: "Focus ring against the offset ring inside it",
    use: "ui",
    category: "focus",
    adjustableTarget: "foreground",
    pick: (t) => [t.roleColors["focus-control"], t.roleColors["focus-offset"]],
  },
  { id: "border-subtle", label: "Decorative separator on card surface", use: "decorative", category: "border-subtle", adjustableTarget: "foreground", pick: (t) => [t.roleColors["border-subtle"], t.surface] },
  { id: "border-control", label: "Control border against surface", use: "ui", category: "border-control", adjustableTarget: "foreground", pick: (t) => [t.roleColors["border-control"], t.surface] },
  { id: "success", label: "Success text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.success, t.background] },
  { id: "badge-success", label: "Success badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-success"], t.badgeBackgrounds.success] },
  { id: "warning", label: "Warning text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.warning, t.background] },
  { id: "badge-warning", label: "Warning badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-warning"], t.badgeBackgrounds.warning] },
  { id: "danger", label: "Danger text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.danger, t.background] },
  { id: "badge-danger", label: "Danger badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-danger"], t.badgeBackgrounds.danger] },
  { id: "info", label: "Info text on canvas", use: "body", category: "text", adjustableTarget: "foreground", pick: (t) => [t.roleColors.info, t.background] },
  { id: "badge-info", label: "Info badge label on tinted fill", use: "body", category: "badge-text", adjustableTarget: "foreground", pick: (t) => [t.roleColors["badge-info"], t.badgeBackgrounds.info] },
];
