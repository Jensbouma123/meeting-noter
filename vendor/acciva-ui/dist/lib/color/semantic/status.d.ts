import type { SemanticRampSet } from "../types.js";
import type { ModeScale } from "./tables.js";
import type { SemanticRole, SemanticRoles, StatusRole } from "./types.js";
export declare function buildStatusRoles(ramps: SemanticRampSet, scale: ModeScale, background: SemanticRoles["background"]): Record<StatusRole, SemanticRole>;
