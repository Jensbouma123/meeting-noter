import type { SemanticRampSet } from "../types.js";
import type { ModeScale } from "./tables.js";
import type { AccentRole, SemanticRole, SemanticRoles } from "./types.js";
export declare function buildAccentRoles(ramps: SemanticRampSet, scale: ModeScale, background: SemanticRoles["background"]): Readonly<Record<AccentRole, SemanticRole>>;
