import type { ThemeMode } from "../color/index.js";
import type { BadgePalette } from "./constants.js";
/**
 * The roles the contrast solver may move, one per graded pair. Every entry owns
 * exactly one property in {@link ROLE_VARIABLES}.
 */
export declare const SOLVABLE_ROLES: readonly ["body", "body-surface", "muted", "subtle", "action", "action-secondary", "action-accent", "link", "brand", "badge", "focus", "focus-surface", "focus-offset", "focus-control", "border-subtle", "border-control", "success", "badge-success", "warning", "badge-warning", "danger", "badge-danger", "info", "badge-info"];
export type SolvableRole = (typeof SOLVABLE_ROLES)[number];
/**
 * Role to custom property. Injective by construction: no two roles share a
 * property, and no role writes a `--color-<palette>-<stop>` primitive step.
 */
export declare const ROLE_VARIABLES: Readonly<Record<SolvableRole, string>>;
export declare function badgeBackgroundVariable(name: BadgePalette): string;
/**
 * The one property a solved role writes.
 *
 * It no longer depends on the mode: the mapping used to hand `link` and `badge`
 * the same primitive step, and both `body` variants the same `--foreground`, so
 * whichever pair was solved second silently overwrote the first one's fix. Each
 * role now owns a property nothing else writes, seeded from the value it used to
 * read. The second argument is kept so existing call sites keep compiling.
 */
export declare function getCssVariableForPair(pairId: string, _mode?: ThemeMode): string;
