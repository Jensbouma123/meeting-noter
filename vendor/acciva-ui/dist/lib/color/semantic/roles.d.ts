import type { Hex, PaletteName, SemanticRampSet, SurfaceScale } from "../types.js";
import { type RoleConstraint } from "./solver.js";
import type { SemanticRole } from "./types.js";
/** A role whose only requirement is the designer's lightness intent. */
export declare function role(ramps: SemanticRampSet, palette: PaletteName, targetL: number, description: string): SemanticRole;
/** A role the AA gate constrains: the nearest step to intent that conforms. */
export declare function gatedRole(ramps: SemanticRampSet, palette: PaletteName, targetL: number, description: string, required: readonly RoleConstraint[], preferred?: readonly RoleConstraint[]): SemanticRole;
export declare function surfaceRole(surface: SurfaceScale, targetL: number, description: string): SemanticRole;
export declare function gatedSurfaceRole(surface: SurfaceScale, targetL: number, description: string, required: readonly RoleConstraint[]): SemanticRole;
export declare function hexOf(semanticRole: SemanticRole): Hex;
/**
 * Picks the neutral step — lightest or darkest available — that reads best on
 * `background`. WCAG 2.1 ratio decides, |Lc| breaks ties, so both engines gate
 * the choice.
 */
export declare function onColorRole(ramps: SemanticRampSet, background: SemanticRole, description: string): SemanticRole;
