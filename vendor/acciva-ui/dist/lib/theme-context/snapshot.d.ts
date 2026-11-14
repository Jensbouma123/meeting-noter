import type { HarmonyMode } from "../color/index.js";
import type { ModeTokenOverrides, StoredThemeSnapshot } from "./types.js";
/** The seed and harmony the page's stylesheet declares; the fallback when nothing is stored. */
export type SnapshotDefaults = {
    readonly primaryHex: string;
    readonly harmony: HarmonyMode;
};
export declare const DEFAULT_SNAPSHOT_DEFAULTS: SnapshotDefaults;
export declare const EMPTY_TOKEN_OVERRIDES: ModeTokenOverrides;
export declare function createServerThemeSnapshot(defaults: SnapshotDefaults): StoredThemeSnapshot;
export declare function getClientThemeSnapshot(defaults: SnapshotDefaults): StoredThemeSnapshot;
export declare function subscribeToThemeStorage(callback: () => void): () => void;
