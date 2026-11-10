import type { Hex } from "../types.js";
import type { DtcgDocument, DtcgGroup, DtcgToken, TokenGraphOptions } from "./types.js";
export type { DtcgDocument, DtcgGroup, DtcgToken, TokenGraphOptions } from "./types.js";
export declare function isDtcgToken(node: DtcgGroup | DtcgToken): node is DtcgToken;
/**
 * Builds the three-layer W3C DTCG 2025.10 graph for a seed colour: primitive
 * ramps hold literal `oklch()` values, semantic roles alias primitives per
 * mode, and component tokens alias semantic roles only.
 */
export declare function buildTokenGraph(seed: Hex, opts?: TokenGraphOptions): DtcgDocument;
