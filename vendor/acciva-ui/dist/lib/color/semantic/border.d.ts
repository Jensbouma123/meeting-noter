import type { SemanticRampSet, SurfaceScale } from "../types.js";
import type { ModeScale } from "./tables.js";
import type { BorderRole, SemanticRole, SemanticRoles } from "./types.js";
export declare function buildBorderRoles(ramps: SemanticRampSet, surface: SurfaceScale, scale: ModeScale, background: SemanticRoles["background"], accent: SemanticRoles["accent"]): Readonly<Record<BorderRole, SemanticRole>>;
