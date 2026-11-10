import type { SurfaceScale, ThemeMode } from "../types.js";
import type { BackgroundRole, SemanticRole } from "./types.js";
export declare function buildBackgroundRoles(surface: SurfaceScale, mode: ThemeMode): Readonly<Record<BackgroundRole, SemanticRole>>;
