import type { ThemeMode } from "@/lib/color/index";
import type { BadgePalette } from "@/lib/theme-tokens/constants";

/**
 * The roles the contrast solver may move, one per graded pair. Every entry owns
 * exactly one property in {@link ROLE_VARIABLES}.
 */
export const SOLVABLE_ROLES = [
  "body",
  "body-surface",
  "muted",
  "subtle",
  "action",
  "action-secondary",
  "action-accent",
  "link",
  "brand",
  "badge",
  "focus",
  "focus-surface",
  "focus-offset",
  "focus-control",
  "border-subtle",
  "border-control",
  "success",
  "badge-success",
  "warning",
  "badge-warning",
  "danger",
  "badge-danger",
  "info",
  "badge-info",
] as const;

export type SolvableRole = (typeof SOLVABLE_ROLES)[number];

/**
 * Role to custom property. Injective by construction: no two roles share a
 * property, and no role writes a `--color-<palette>-<stop>` primitive step.
 */
export const ROLE_VARIABLES: Readonly<Record<SolvableRole, string>> = {
  body: "--foreground",
  "body-surface": "--surface-foreground",
  muted: "--muted-foreground",
  subtle: "--subtle-foreground",
  action: "--button-primary-background",
  "action-secondary": "--button-secondary-background",
  "action-accent": "--button-accent-background",
  link: "--link-foreground",
  brand: "--brand-foreground",
  badge: "--badge-primary-foreground",
  focus: "--focus-ring",
  "focus-surface": "--focus-ring-surface",
  "focus-offset": "--focus-ring-offset",
  "focus-control": "--focus-ring-control",
  "border-subtle": "--border-subtle",
  "border-control": "--border-control",
  success: "--success",
  "badge-success": "--badge-success-foreground",
  warning: "--warning",
  "badge-warning": "--badge-warning-foreground",
  danger: "--danger",
  "badge-danger": "--badge-danger-foreground",
  info: "--info",
  "badge-info": "--badge-info-foreground",
};

export function badgeBackgroundVariable(name: BadgePalette): string {
  return `--badge-${name}-background`;
}

/**
 * The one property a solved role writes.
 *
 * It no longer depends on the mode: the mapping used to hand `link` and `badge`
 * the same primitive step, and both `body` variants the same `--foreground`, so
 * whichever pair was solved second silently overwrote the first one's fix. Each
 * role now owns a property nothing else writes, seeded from the value it used to
 * read. The second argument is kept so existing call sites keep compiling.
 */
export function getCssVariableForPair(pairId: string, _mode?: ThemeMode): string {
  const known = ROLE_VARIABLES as Readonly<Record<string, string | undefined>>;
  return known[pairId] ?? ROLE_VARIABLES.body;
}
