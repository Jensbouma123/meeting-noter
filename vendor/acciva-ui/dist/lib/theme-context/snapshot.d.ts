import type { ModeTokenOverrides, StoredThemeSnapshot } from "./types.js";
export declare const EMPTY_TOKEN_OVERRIDES: ModeTokenOverrides;
export declare const SERVER_THEME_SNAPSHOT: StoredThemeSnapshot;
export declare function getServerThemeSnapshot(): StoredThemeSnapshot;
export declare function getClientThemeSnapshot(): StoredThemeSnapshot;
export declare function subscribeToThemeStorage(callback: () => void): () => void;
