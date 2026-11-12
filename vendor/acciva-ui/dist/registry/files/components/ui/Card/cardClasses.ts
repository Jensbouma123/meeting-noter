import type { CardPadding, CardVariant } from "@/components/ui/Card/types";

export type CardSurface = Exclude<CardVariant, "interactive">;

export const surfaceClasses: Record<CardSurface, string> = {
  default: "bg-surface border border-border shadow-xs",
  elevated: "bg-surface border border-border shadow-md dark:shadow-elevation-2",
  bordered: "bg-transparent border-2 border-border",
  ghost: "bg-surface/60 border border-transparent hover:border-border/60",
  // Nested sub-panel inside an existing Card: recedes against the parent surface instead of
  // stacking another shadow on it.
  inset: "bg-background border border-border",
  selectable: "bg-surface border border-border shadow-xs",
};

/**
 * The hover/press affordance. It is only an affordance — it adds no role, focus or keyboard
 * path, so it must sit on something that already has them (`href`, `asChild`, `selectable`).
 */
export const INTERACTIVE_AFFORDANCE =
  "cursor-pointer hover:border-muted-foreground/60 hover:bg-elevation-2 hover:shadow-md active:border-muted-foreground active:bg-elevation-3 active:scale-99 dark:hover:bg-elevation-3 dark:active:bg-elevation-4";

export const SELECTED_SURFACE =
  "border-primary-500 ring-1 ring-primary-500 bg-primary-500/10 dark:border-primary-400 dark:ring-primary-400 dark:bg-primary-400/15";

/**
 * The highlight ring. `ring-inset` keeps it inside the box, so toggling it never shifts layout
 * (SC 1.4.11 Non-text Contrast, 3:1 against the surface). Same brand role as `SELECTED_SURFACE`.
 */
export const HIGHLIGHT_RING = "ring-2 ring-inset ring-primary-500 dark:ring-primary-400";

export const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
};
