import type { Gamut, HarmonyMode, Hex, ThemeMode } from "./types.js";
export type DtcgToken = {
    readonly $value: string;
    readonly $type: "color";
    readonly $description: string;
};
export type DtcgGroup = {
    readonly [key: string]: DtcgGroup | DtcgToken;
};
export type DtcgDocument = {
    readonly $description: string;
    readonly color: {
        readonly primitive: DtcgGroup;
        readonly semantic: Readonly<Record<ThemeMode, DtcgGroup>>;
        readonly component: Readonly<Record<ThemeMode, DtcgGroup>>;
    };
};
export type TokenGraphOptions = {
    readonly gamut?: Gamut;
    readonly harmony?: HarmonyMode;
    readonly precision?: number;
};
export declare function isDtcgToken(node: DtcgGroup | DtcgToken): node is DtcgToken;
/**
 * Builds the three-layer W3C DTCG 2025.10 graph for a seed colour: primitive
 * ramps hold literal `oklch()` values, semantic roles alias primitives per
 * mode, and component tokens alias semantic roles only.
 */
export declare function buildTokenGraph(seed: Hex, opts?: TokenGraphOptions): DtcgDocument;
