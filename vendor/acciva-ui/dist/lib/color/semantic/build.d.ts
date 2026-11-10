import type { SemanticRampSet, SurfaceScale, ThemeMode } from "../types.js";
import type { SemanticRoles } from "./types.js";
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
export declare function buildSemanticRoles(ramps: SemanticRampSet, mode: ThemeMode, surface?: SurfaceScale): SemanticRoles;
