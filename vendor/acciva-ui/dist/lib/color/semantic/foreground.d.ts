import type { SemanticRampSet } from "../types.js";
import type { ModeScale } from "./tables.js";
import type { ForegroundRole, SemanticRole, SemanticRoles } from "./types.js";
export declare function buildForegroundRoles(ramps: SemanticRampSet, scale: ModeScale, background: SemanticRoles["background"]): Readonly<Record<ForegroundRole, SemanticRole>>;
