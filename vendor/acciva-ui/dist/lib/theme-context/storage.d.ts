import type { StoredTheme } from "./types.js";
export declare const STORAGE_KEY = "acciva-theme";
export declare function readRawStoredTheme(): string | null;
export declare function readStoredTheme(): StoredTheme | null;
export declare function prefersDarkMode(): boolean;
