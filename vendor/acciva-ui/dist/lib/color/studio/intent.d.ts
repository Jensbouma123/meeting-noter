import { type RolePath } from "../audit/index.js";
import type { AppPalette } from "../../theme-tokens/index.js";
import type { Hex, StepLabel, ThemeMode } from "../types.js";
import type { RoleIntent, StudioRole } from "./types.js";
/**
 * Solve one role across all of its contexts for both modes at once.
 */
export declare function solveRoleIntent(palette: AppPalette, role: StudioRole, intent: StepLabel, contextHex?: (role: RolePath, mode: ThemeMode) => Hex): RoleIntent;
/**
 * Record the per-mode divergence the designer chose. Legal only when both modes
 * solve alone, which is exactly `reason === "no-shared-step"` — the caller
 * checks, and a `null` step never becomes a colour.
 */
export declare function splitIntent(intent: RoleIntent): RoleIntent;
export declare function unresolveIntent(intent: RoleIntent): RoleIntent;
